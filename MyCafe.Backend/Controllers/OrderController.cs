using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrderController(AppDbContext context)
    {
        _context = context;
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

        // Check if there's an active order for this table
        if (table.CurrentOrderId != null)
        {
            order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == table.CurrentOrderId);
                
            if (order == null || order.Status == "PAID")
            {
                // Should not happen if logic is correct, but safe fallback
                isNewOrder = true;
                order = CreateNewOrder(table.Id);
            }
        }
        else
        {
            isNewOrder = true;
            order = CreateNewOrder(table.Id);
        }

        // Add items
        foreach (var itemDto in request.Items)
        {
            // Optional: Validate product price from DB to prevent tampering
            // But trusting frontend for now as per requirements "simple"
            
            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductId = itemDto.ProductId,
                ProductName = itemDto.ProductName,
                Price = itemDto.Price,
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
}

public class PlaceOrderRequest
{
    public int TableId { get; set; }
    public List<OrderItemDto> Items { get; set; }
}

public class OrderItemDto
{
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}
