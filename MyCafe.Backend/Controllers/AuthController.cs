using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var user = await _context.Users
                .AsNoTracking() // Don't track - we're just reading
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.Password == request.Password);
            
            if (user != null)
            {
                Console.WriteLine($"[LOGIN] Success: {user.Username} ({user.Role})");
                return Ok(new { Token = $"valid-{user.Role.ToLower()}-token", Role = user.Role });
            }
            
            Console.WriteLine($"[LOGIN] Failed: Invalid credentials for {request.Username}");
            return Unauthorized("Tài khoản hoặc mật khẩu không chính xác");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LOGIN ERROR] {ex.Message}");
            if (ex.InnerException != null) Console.WriteLine($"[LOGIN INNER] {ex.InnerException.Message}");
            return StatusCode(500, "Lỗi đăng nhập - vui lòng thử lại");
        }
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
