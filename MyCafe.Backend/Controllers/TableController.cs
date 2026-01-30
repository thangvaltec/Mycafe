using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TableController : ControllerBase
{
    private readonly AppDbContext _context;

    public TableController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTables()
    {
        var tables = await _context.Tables
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .ToListAsync();
        return Ok(tables);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTable(Table table)
    {
        if (string.IsNullOrEmpty(table.TableNumber))
        {
            table.TableNumber = table.Name;
        }

        if (await _context.Tables.AnyAsync(t => t.TableNumber == table.TableNumber))
            return BadRequest("Số bàn (Table Number) này đã tồn tại");

        _context.Tables.Add(table);
        await _context.SaveChangesAsync();
        return Ok(table);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTable(int id, Table table)
    {
        if (id != table.Id) return BadRequest("Lỗi dữ liệu: ID không khớp");

        _context.Entry(table).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return Ok(table);
    }

    // Optional: Reset table Manually if needed, though Payment will handle it usually
    [HttpPost("{id}/reset")]
    public async Task<IActionResult> ResetTable(int id)
    {
        var table = await _context.Tables.FindAsync(id);
        if (table == null) return NotFound();

        table.Status = "Empty";
        table.IsOccupied = false;
        table.CurrentOrderId = null;
        
        await _context.SaveChangesAsync();
        return Ok(table);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTable(int id)
    {
        var table = await _context.Tables.FindAsync(id);
        if (table == null) return NotFound();

        if (table.IsOccupied)
        {
            return BadRequest("Không thể xóa bàn đang có khách.");
        }

        _context.Tables.Remove(table);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã xóa bàn thành công" });
    }
}
