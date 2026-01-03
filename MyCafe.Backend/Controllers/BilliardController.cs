using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;
using System.Linq;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BilliardController : ControllerBase
{
    private readonly AppDbContext _context;

    public BilliardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSessions()
    {
        var sessions = await _context.BilliardSessions
            .Where(s => s.Status == "ACTIVE")
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartSession([FromBody] StartBilliardRequest request)
    {
        // Check if table is already active
        var activeSession = await _context.BilliardSessions
            .FirstOrDefaultAsync(s => s.TableId == request.TableId && s.Status == "ACTIVE");
        
        if (activeSession != null)
        {
            return BadRequest("Bàn này đang có người chơi!");
        }

        // Use custom StartTime if provided (adjusted to UTC if needed, or assume UTC from client)
        // Note: Client should send ISO8601
        var startTime = request.StartTime ?? DateTime.UtcNow;

        var session = new BilliardSession
        {
            TableId = request.TableId,
            GuestName = request.GuestName,
            NumPeople = request.NumPeople,
            PricePerHour = request.PricePerHour,
            StartTime = startTime,
            Status = "ACTIVE"
        };

        _context.BilliardSessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(session);
    }

    [HttpPut("{id}/stop")]
    public async Task<IActionResult> StopSession(Guid id)
    {
        var session = await _context.BilliardSessions.FindAsync(id);
        if (session == null) return NotFound();

        session.EndTime = DateTime.UtcNow;
        // Total amount will be calculated and finalized at Payment step generally, 
        // but here we can just update the end time or let the frontend calculate.
        // Let's perform a server-side calc for safety too.
        var duration = session.EndTime.Value - session.StartTime;
        var hours = duration.TotalHours;
        session.TotalAmount = (decimal)hours * session.PricePerHour;
        
        await _context.SaveChangesAsync();
        return Ok(session);
    }

    [HttpGet("{tableId}/bill")]
    public async Task<IActionResult> GetBill(int tableId)
    {
        var session = await _context.BilliardSessions
            .FirstOrDefaultAsync(s => s.TableId == tableId && s.Status == "ACTIVE");

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.TableId == tableId && (o.Status == "NEW" || o.Status == "PROCESSING" || o.Status == "COMPLETED"));

        // If no session and no order, return 404
        if (session == null && order == null) return NotFound("Không có hóa đơn active cho bàn này");

        var response = new BillPreviewResponse { TableId = tableId };

        // 1. Calculate Time Fee
        if (session != null)
        {
            var now = DateTime.UtcNow;
            var duration = now - session.StartTime;
            var hours = duration.TotalHours;
            var timeAmount = (decimal)hours * session.PricePerHour;

            // Round to nearest 1000? Or keep precise? Let's round to nearest 1000 or 500
            // Logic: usually just keep precise or integer.
            // Let's ceil to 1000 VND
            timeAmount = Math.Ceiling(timeAmount / 1000) * 1000;

            response.BilliardSessionId = session.Id;
            response.StartTime = session.StartTime;
            response.EndTime = now;
            response.DurationMinutes = (int)duration.TotalMinutes;
            response.TimeFee = timeAmount;
            
            response.Items.Add(new BillItem 
            {
                Name = $"Tiền giờ ({duration.Hours}h {duration.Minutes}m)",
                Quantity = 1,
                UnitPrice = timeAmount,
                TotalPrice = timeAmount,
                Type = "TIME_FEE"
            });
        }

        // 2. Add Order Items
        if (order != null)
        {
            response.OrderId = order.Id;
            foreach (var item in order.Items)
            {
                response.Items.Add(new BillItem
                {
                    Name = item.ProductName ?? "Món ăn",
                    Quantity = item.Quantity,
                    UnitPrice = item.Price,
                    TotalPrice = item.Price * item.Quantity,
                    Type = "MENU_ITEM"
                });
            }
        }

        response.TotalAmount = response.Items.Sum(i => i.TotalPrice);
        return Ok(response);
    }

    [HttpPost("{tableId}/checkout")]
    public async Task<IActionResult> Checkout(int tableId, [FromBody] BilliardCheckoutRequest request)
    {
        Console.WriteLine($"[Checkout] INITIATED for Table {tableId}");
        Console.WriteLine($"[Checkout] Request Data: Method={request.PaymentMethod}, Start={request.FinalStartTime}, End={request.FinalEndTime}");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var session = await _context.BilliardSessions
                .FirstOrDefaultAsync(s => s.TableId == tableId && s.Status == "ACTIVE");
            Console.WriteLine($"[Checkout] Found Session: {session?.Id} (Status: {session?.Status})");

            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.TableId == tableId && (o.Status == "NEW" || o.Status == "PROCESSING" || o.Status == "COMPLETED"));
            Console.WriteLine($"[Checkout] Found Order: {order?.Id} (Status: {order?.Status})");
            
            var table = await _context.Tables.FirstOrDefaultAsync(t => t.Id == tableId);

            if (session == null && order == null) 
            {
                Console.WriteLine("[Checkout] ERROR: No Session and No Order found!");
                return BadRequest("Không có gì để thanh toán!");
            }

            // Use Manual Times or Current Time
            var finalEndTime = request.FinalEndTime ?? DateTime.UtcNow;
            
            decimal totalAmount = 0;
            var invoice = new Invoice
            {
                TableId = tableId,
                PaymentMethod = request.PaymentMethod,
                CreatedAt = finalEndTime,
                BilliardSessionId = session?.Id,
                OrderId = order?.Id,
                IdentifyString = $"{table?.Name ?? "Table " + tableId} ({finalEndTime.ToLocalTime():yyyy-MM-dd HH:mm})"
            };

            // 1. Process Session
            if (session != null)
            {
                // Verify Manual Start Time if provided
                if (request.FinalStartTime.HasValue) 
                {
                    session.StartTime = request.FinalStartTime.Value;
                }

                var duration = finalEndTime - session.StartTime;
                var timeAmount = Math.Ceiling(((decimal)duration.TotalHours * session.PricePerHour) / 1000) * 1000;
                
                session.EndTime = finalEndTime;
                session.TotalAmount = timeAmount;
                session.Status = "PAID";

                invoice.Items.Add(new InvoiceItem
                {
                    Name = $"Tiền giờ ({duration.Hours}h {duration.Minutes}m)",
                    Quantity = 1,
                    UnitPrice = timeAmount,
                    TotalPrice = timeAmount,
                    Type = "TIME_FEE"
                });
            }

            // 2. Process Order
            if (order != null)
            {
                order.Status = "PAID";
                order.PaymentMethod = request.PaymentMethod;
                order.PaymentAmount = request.PaymentAmount; 
                
                foreach (var item in order.Items)
                {
                    invoice.Items.Add(new InvoiceItem
                    {
                        Name = item.ProductName ?? "Item",
                        Quantity = item.Quantity,
                        UnitPrice = item.Price,
                        TotalPrice = item.Price * item.Quantity,
                        Type = "MENU_ITEM"
                    });
                }
            }

            // 3. Finalize Invoice
            invoice.TotalAmount = invoice.Items.Sum(i => i.TotalPrice);
            _context.Invoices.Add(invoice);

            // 4. Update Table Status
            if (table != null)
            {
                table.Status = "Empty";
                table.IsOccupied = false;
                table.CurrentOrderId = null;
                table.GuestName = null;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(invoice);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Lỗi thanh toán: " + ex.Message);
        }
    }

    // --- Legacy / Simple Actions ---

    [HttpPut("{id}/pay")]
    public async Task<IActionResult> PaySession(Guid id, [FromBody] PayBilliardRequest request)
    {
        // ... (Keep this for backward compat if needed, or deprecate)
        // For current refactor, we prefer the Checkout endpoint.
        var session = await _context.BilliardSessions.FindAsync(id);
        if (session == null) return NotFound();
        if (session.Status == "PAID") return BadRequest("Session already paid");
        session.EndTime = request.EndTime ?? DateTime.UtcNow;
        session.TotalAmount = request.TotalAmount; 
        session.Status = "PAID";
        await _context.SaveChangesAsync();
        return Ok(session);
    }
}

public class StartBilliardRequest
{
    public int TableId { get; set; }
    public string GuestName { get; set; }
    public int NumPeople { get; set; }
    public decimal PricePerHour { get; set; }
    public DateTime? StartTime { get; set; }
}

public class PayBilliardRequest
{
    public decimal TotalAmount { get; set; }
    public DateTime? EndTime { get; set; }
}

public class BillPreviewResponse
{
    public int TableId { get; set; }
    public Guid? BilliardSessionId { get; set; }
    public Guid? OrderId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int DurationMinutes { get; set; }
    public decimal TimeFee { get; set; }
    public decimal TotalAmount { get; set; }
    public List<BillItem> Items { get; set; } = new();
}

public class BillItem
{
    public string Name { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string Type { get; set; }
}

public class BilliardCheckoutRequest
{
    public string PaymentMethod { get; set; } = "cash";
    public decimal? PaymentAmount { get; set; }
    public DateTime? FinalStartTime { get; set; }
    public DateTime? FinalEndTime { get; set; }
}
