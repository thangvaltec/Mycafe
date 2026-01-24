using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
    {
        Order? order = null;
        Table? table = null;

        // Try to find order by OrderId first (if provided)
        if (request.OrderId.HasValue)
        {
            order = await _context.Orders.FindAsync(request.OrderId.Value);
            if (order == null) return NotFound("Không tìm thấy đơn hàng");
            
            table = await _context.Tables.FindAsync(order.TableId);
        }
        else if (request.TableId.HasValue)
        {
            // Fallback: Find by TableId (original logic)
            table = await _context.Tables.FindAsync(request.TableId.Value);
            if (table == null) return NotFound("Không tìm thấy bàn");

            if (table.CurrentOrderId == null)
                return BadRequest("Bàn này chưa có đơn hàng nào");

            order = await _context.Orders.FindAsync(table.CurrentOrderId);
            if (order == null) return NotFound("Không tìm thấy đơn hàng");
        }
        else
        {
            return BadRequest("Phải cung cấp OrderId hoặc TableId");
        }

        // Check if already paid
        if (order.Status == "PAID")
            return BadRequest("Đơn hàng đã được thanh toán");

        // Apply Discount Logic
        decimal discount = request.Discount;
        decimal finalTotal = order.TotalAmount - discount;
        if (finalTotal < 0) finalTotal = 0;

        decimal change = 0;
        if (request.PaymentMethod == "cash")
        {
            if (request.ReceivedAmount < finalTotal)
                return BadRequest("Số tiền khách đưa chưa đủ");
            change = request.ReceivedAmount - finalTotal;
        }

        // Update Order
        order.Status = "PAID";
        order.PaymentMethod = request.PaymentMethod;
        order.PaymentAmount = request.ReceivedAmount; 
        order.ChangeAmount = change;
        order.Discount = discount; // NEW: Save discount to order for history view

        // Create Payment Record (Legacy)
        var payment = new Payment
        {
            OrderId = order.Id,
            PaymentMethod = request.PaymentMethod,
            Amount = finalTotal, // Net Revenue
            ReceivedAmount = request.PaymentMethod == "cash" ? request.ReceivedAmount : finalTotal,
            ChangeAmount = change,
            PaidAt = DateTime.UtcNow
        };
        _context.Payments.Add(payment);

        // Create Invoice Record (New System - Supports Discount Storage)
        var invoice = new Invoice
        {
            TableId = table?.Id ?? 0,
            OrderId = order.Id,
            TotalAmount = finalTotal,
            PaymentMethod = request.PaymentMethod,
            Discount = discount,
            IdentifyString = $"{table?.Name ?? "Order " + order.OrderNumber} ({DateTime.Now:HH:mm})",
            CreatedAt = DateTime.UtcNow
        };
        
        // Copy Items to Invoice
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
        _context.Invoices.Add(invoice);

        // Reset Table (if exists)
        if (table != null)
        {
            table.Status = "Empty";
            table.IsOccupied = false;
            table.CurrentOrderId = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new { 
            Success = true, 
            Change = change, 
            OrderId = order.Id 
        });
    }
}

public class CheckoutRequest
{
    public int? TableId { get; set; }
    public Guid? OrderId { get; set; }
    public required string PaymentMethod { get; set; } // "cash" or "bank_transfer"
    public decimal ReceivedAmount { get; set; }
    public decimal Discount { get; set; } = 0;
}
