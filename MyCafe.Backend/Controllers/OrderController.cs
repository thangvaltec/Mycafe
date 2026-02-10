using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;
using System.Linq;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly AppDbContext _context;

    // ===== IN-MEMORY NOTIFICATION QUEUE (No DB access for polling) =====
    private static readonly List<OrderNotification> _notifications = new();
    private static readonly object _lock = new();

    public OrderController(AppDbContext context)
    {
        _context = context;
    }

    // ===== SMART POLLING: Check for new orders (Zero DB access) =====
    [HttpGet("check-new")]
    public IActionResult CheckNewOrders([FromQuery] string lastCheckTime)
    {
        if (!DateTime.TryParse(lastCheckTime, null, System.Globalization.DateTimeStyles.RoundtripKind, out var clientLastCheck))
        {
            return BadRequest("Invalid lastCheckTime format. Use ISO 8601.");
        }

        List<OrderNotification> newOrders;
        DateTime latestTime;

        lock (_lock)
        {
            newOrders = _notifications.Where(n => n.Time > clientLastCheck).ToList();
            latestTime = _notifications.Count > 0 ? _notifications.Max(n => n.Time) : clientLastCheck;
        }

        return Ok(new
        {
            hasNew = newOrders.Count > 0,
            latestTime = latestTime.ToString("o"),
            orders = newOrders.Select(n => new
            {
                tableId = n.TableId,
                tableName = n.TableName,
                items = n.Items
            })
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Table) // Optional
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(orders);
    }

    [HttpGet("table/{tableId}")]
    public async Task<IActionResult> GetOrderForTable(int tableId)
    {
        // Get active order (not paid)
        var order = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.TableId == tableId && o.Status != "PAID" && o.Status != "CANCELLED")
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequest request)
    {
        if (request.Items == null || !request.Items.Any())
            return BadRequest("Đơn hàng chưa có món nào");

        // Find table
        var table = await _context.Tables.FindAsync(request.TableId);
        if (table == null) return NotFound("Không tìm thấy bàn");

        Order order;
        bool isNewOrder = false;

        // CRITICAL FIX: Always check DB for active orders FIRST (not just table.CurrentOrderId)
        // This prevents duplicate orders when CurrentOrderId is null but active orders exist
        var existingActiveOrder = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => 
                o.TableId == request.TableId && 
                o.Status != "PAID" && 
                o.Status != "CANCELLED");

        if (existingActiveOrder != null)
        {
            // Use existing order
            order = existingActiveOrder;
            
            // FIX: Sync table.CurrentOrderId if it's wrong/null
            if (table.CurrentOrderId != order.Id)
            {
                table.CurrentOrderId = order.Id;
                Console.WriteLine($"[ORDER FIX] Table {table.Id} had wrong CurrentOrderId, synced to {order.Id}");
            }
        }
        else
        {
            // No active order found - create new one
            isNewOrder = true;
            order = CreateNewOrder(table.Id);
            Console.WriteLine($"[ORDER] Creating new order for Table {table.Id}");
        }

        // Add items
        foreach (var itemDto in request.Items)
        {
            decimal finalPrice = itemDto.Price;
            string finalName = itemDto.ProductName;

            // Robust: Look up price from DB to ensure validity and non-zero
            if (itemDto.ProductId.HasValue)
            {
                var product = await _context.MenuItems.FindAsync(itemDto.ProductId.Value);
                if (product != null)
                {
                    finalPrice = product.Price;
                    finalName = product.Name; // Ensure name is correct too
                }
            }
            
            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductId = itemDto.ProductId,
                ProductName = finalName ?? "Món lạ",
                Price = finalPrice,
                Quantity = itemDto.Quantity
            };
            order.Items.Add(orderItem);
            _context.OrderItems.Add(orderItem);
        }

        // Recalculate total
        order.TotalAmount = order.Items.Sum(i => i.Price * i.Quantity);

        if (isNewOrder)
        {
            _context.Orders.Add(order);
            // Update table status
            table.Status = "Ordering";
            table.IsOccupied = true;
            table.CurrentOrderId = order.Id;
        }
        else
        {
             _context.Entry(order).State = EntityState.Modified;
        }

        await _context.SaveChangesAsync();

        // ===== PUSH TO NOTIFICATION QUEUE after successful save =====
        var itemsList = request.Items.Select(i => new NotificationItem
        {
            Name = i.ProductName,
            Quantity = i.Quantity
        }).ToList();

        lock (_lock)
        {
            _notifications.Add(new OrderNotification
            {
                Time = DateTime.UtcNow,
                TableId = table.Id,
                TableName = table.Name ?? $"Bàn {table.Id}",
                Items = itemsList
            });

            // Auto-clean: remove entries older than 5 minutes to prevent memory leak
            var cutoff = DateTime.UtcNow.AddMinutes(-5);
            _notifications.RemoveAll(n => n.Time < cutoff);
        }
        Console.WriteLine($"[NOTIFY] New order queued: Table {table.Name} ({request.Items.Count} items)");

        return Ok(order);
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrder(Guid id, Order order)
    {
        if (id != order.Id) return BadRequest();
        _context.Entry(order).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return Ok(order);
    }

    private Order CreateNewOrder(int tableId)
    {
        return new Order
        {
            Id = Guid.NewGuid(),
            TableId = tableId,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };
    }
    [HttpDelete("{orderId}/items/{itemId}")]
    public async Task<IActionResult> DeleteOrderItem(Guid orderId, Guid itemId)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return NotFound("Order not found");

        var item = order.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null) return NotFound("Item not found in order");

        order.Items.Remove(item);
        _context.OrderItems.Remove(item);

        // Recalculate total
        order.TotalAmount = order.Items.Sum(i => i.Price * i.Quantity);
        
        await _context.SaveChangesAsync();

        return Ok(order);
    }
    [HttpPut("{orderId}/items/{itemId}")]
    public async Task<IActionResult> UpdateOrderItem(Guid orderId, Guid itemId, [FromBody] UpdateOrderItemRequest request)
    {
        var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return NotFound("Order not found");

        var item = order.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null) return NotFound("Item not found in order");

        if (request.Quantity <= 0)
        {
            // If quantity <= 0, remove item
            order.Items.Remove(item);
            _context.OrderItems.Remove(item);
        }
        else
        {
            item.Quantity = request.Quantity;
        }

        // Recalculate total
        order.TotalAmount = order.Items.Sum(i => i.Price * i.Quantity);
        
        await _context.SaveChangesAsync();

        return Ok(order);
    }
}

public class UpdateOrderItemRequest
{
    public int Quantity { get; set; }
}

public class PlaceOrderRequest
{
    public int TableId { get; set; }
    public List<OrderItemDto> Items { get; set; }
}

public class OrderItemDto
{
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}

// ===== Notification Models (In-Memory only, not stored in DB) =====
public class OrderNotification
{
    public DateTime Time { get; set; }
    public int TableId { get; set; }
    public string TableName { get; set; } = "";
    public List<NotificationItem> Items { get; set; } = new();
}

public class NotificationItem
{
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
}
