using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public MenuController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    // --- Categories ---

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories.ToListAsync();
        return Ok(categories);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(Category category)
    {
        if (string.IsNullOrWhiteSpace(category.Name))
            return BadRequest("Tên danh mục không được để trống");

        category.Id = Guid.NewGuid(); // Ensure new ID
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(Guid id, Category category)
    {
        if (id != category.Id) return BadRequest("Lỗi dữ liệu: ID không khớp");

        _context.Entry(category).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        // Check validation: Cannot delete if products exist
        bool hasProducts = await _context.MenuItems.AnyAsync(p => p.CategoryId == id);
        if (hasProducts) return BadRequest("Không thể xóa danh mục đang chứa món ăn");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // --- Menu Items ---

    [HttpGet("items")]
    public async Task<IActionResult> GetMenuItems()
    {
        var items = await _context.MenuItems.Include(m => m.Category).ToListAsync();
        return Ok(items);
    }

    [HttpGet("items/{id}")]
    public async Task<IActionResult> GetMenuItem(Guid id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateMenuItem(MenuItem item)
    {
        if (string.IsNullOrWhiteSpace(item.Name))
            return BadRequest("Tên món không được để trống");

        item.Id = Guid.NewGuid();
        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateMenuItem(Guid id, MenuItem item)
    {
        if (id != item.Id) return BadRequest("Lỗi dữ liệu: ID không khớp");

        // Fetch existing to check for image change
        var existingItem = await _context.MenuItems.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (existingItem != null)
        {
            // If ImagePath changed and old one exists, delete old file
            if (!string.IsNullOrEmpty(existingItem.ImagePath) && 
                existingItem.ImagePath != item.ImagePath)
            {
                DeleteImageFile(existingItem.ImagePath);
            }
        }

        _context.Entry(item).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPost("items/{id}/toggle")]
    public async Task<IActionResult> ToggleItem(Guid id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        item.IsActive = !item.IsActive;
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteMenuItem(Guid id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        // Delete associated image
        if (!string.IsNullOrEmpty(item.ImagePath))
        {
            DeleteImageFile(item.ImagePath);
        }

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // --- Helper to delete physical file ---
    private void DeleteImageFile(string relativePath)
    {
        try
        {
            // Safety check: Only delete files in /uploads/
            if (string.IsNullOrWhiteSpace(relativePath) || !relativePath.StartsWith("/uploads/")) return;

            var webRootPath = _environment.WebRootPath;
            // relativePath e.g. /uploads/foods/abc.jpg -> remove leading slash
            var filePath = Path.Combine(webRootPath, relativePath.TrimStart('/'));

            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                Console.WriteLine($"[Image Cleanup] Deleted old file: {filePath}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Image Cleanup Error] Could not delete {relativePath}: {ex.Message}");
        }
    }

    // --- Image Upload ---

    [HttpPost("upload")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Chưa chọn tệp tin nào");

        // Validate extension
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest("Định dạng tệp không hợp lệ");

        // Generate unique filename
        var fileName = $"{Guid.NewGuid()}{extension}";
        var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", "foods");
        
        // Ensure directory exists
        if (!Directory.Exists(uploadPath))
            Directory.CreateDirectory(uploadPath);

        var filePath = Path.Combine(uploadPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Return relative path
        var relativePath = $"/uploads/foods/{fileName}";
        return Ok(new { path = relativePath });
    }
}
