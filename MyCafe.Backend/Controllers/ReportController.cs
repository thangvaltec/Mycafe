using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStatistics([FromQuery] string period = "daily")
    {
        // Simple daily stats for now
        var now = DateTime.UtcNow;
        var startOfDay = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        
        var revenue = await _context.Payments
            .Where(p => p.PaidAt >= startOfDay)
            .SumAsync(p => p.Amount);

        var expenses = await _context.Expenses
            .Where(e => e.Date >= startOfDay)
            .SumAsync(e => e.Amount);
            
        var orderCount = await _context.Payments
            .Where(p => p.PaidAt >= startOfDay)
            .CountAsync();

        return Ok(new
        {
            Revenue = revenue,
            Expenses = expenses,
            Profit = revenue - expenses,
            Orders = orderCount
        });
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> GetExpenses()
    {
        var expenses = await _context.Expenses.OrderByDescending(e => e.Date).ToListAsync();
        return Ok(expenses);
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense(Expense expense)
    {
        if (string.IsNullOrWhiteSpace(expense.Description))
            return BadRequest("Mô tả chi phí không được để trống");

        expense.Id = Guid.NewGuid();
        expense.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc); // Ensure UTC
        
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpPut("expenses/{id}")]
    public async Task<IActionResult> UpdateExpense(Guid id, Expense expense)
    {
        if (id != expense.Id) return BadRequest();

        var existing = await _context.Expenses.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Description = expense.Description;
        existing.Amount = expense.Amount;
        existing.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc);

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("expenses/{id}")]
    public async Task<IActionResult> DeleteExpense(Guid id)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null) return NotFound();

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv()
    {
        var payments = await _context.Payments
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        var builder = new StringBuilder();
        builder.AppendLine("Date,OrderId,Method,Amount");

        foreach (var p in payments)
        {
            builder.AppendLine($"{p.PaidAt},{p.OrderId},{p.PaymentMethod},{p.Amount}");
        }

        var bytes = Encoding.UTF8.GetBytes(builder.ToString());
        return File(bytes, "text/csv", "revenue_report.csv");
    }
}
