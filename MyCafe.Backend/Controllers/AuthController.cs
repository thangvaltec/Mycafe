using Microsoft.AspNetCore.Mvc;
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
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = _context.Users.FirstOrDefault(u => u.Username == request.Username && u.Password == request.Password);
        
        if (user != null)
        {
            return Ok(new { Token = $"valid-{user.Role.ToLower()}-token", Role = user.Role });
        }
        return Unauthorized("Tài khoản hoặc mật khẩu không chính xác");
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
