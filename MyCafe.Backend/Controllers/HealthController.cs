using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        try
        {
            // Quick DB check - just verify connection works
            var canConnect = await _context.Database.CanConnectAsync();
            
            if (canConnect)
            {
                return Ok(new 
                { 
                    Status = "Healthy",
                    Timestamp = DateTime.UtcNow,
                    Database = "Connected"
                });
            }
            
            return StatusCode(503, new 
            { 
                Status = "Unhealthy",
                Timestamp = DateTime.UtcNow,
                Database = "Disconnected"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[HEALTH CHECK ERROR] {ex.Message}");
            return StatusCode(503, new 
            { 
                Status = "Unhealthy",
                Timestamp = DateTime.UtcNow,
                Error = ex.Message
            });
        }
    }

    [HttpGet("ping")]
    public IActionResult Ping()
    {
        // Simple ping without DB check - just to keep service alive
        return Ok(new { Status = "Alive", Timestamp = DateTime.UtcNow });
    }
}
