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

        // Check for old image clean up
        var existing = await _context.MenuItems.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (existing != null && !string.IsNullOrEmpty(existing.ImagePath) && existing.ImagePath != item.ImagePath)
        {
             DeleteImageFile(existing.ImagePath); // Deletes from Cloudinary
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

        if (!string.IsNullOrEmpty(item.ImagePath)) 
        {
            DeleteImageFile(item.ImagePath);
        }

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // --- Cloudinary Integration ---

    private CloudinaryDotNet.Cloudinary GetCloudinary()
    {
        var cloudName = Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
        var apiKey = Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
        var apiSecret = Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

        if (string.IsNullOrEmpty(cloudName) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(apiSecret))
            throw new Exception("Cloudinary config missing");

        var account = new CloudinaryDotNet.Account(cloudName, apiKey, apiSecret);
        return new CloudinaryDotNet.Cloudinary(account);
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Chưa chọn tệp tin nào");

        try 
        {
            var cloudinary = GetCloudinary();
            var uploadParams = new CloudinaryDotNet.Actions.ImageUploadParams()
            {
                File = new CloudinaryDotNet.FileDescription(file.FileName, file.OpenReadStream()),
                Folder = "mycafe_emenu"
            };
            var uploadResult = await cloudinary.UploadAsync(uploadParams);
            return Ok(new { path = uploadResult.SecureUrl.ToString() });
        }
        catch (Exception ex)
        {
            return BadRequest($"Lỗi upload Cloudinary: {ex.Message}");
        }
    }

    // --- Helper to delete from Cloudinary ---
    private void DeleteImageFile(string imageUrl)
    {
        try
        {
            if (string.IsNullOrEmpty(imageUrl) || !imageUrl.Contains("cloudinary.com")) return;

            // Extract Public ID: .../mycafe_emenu/file.jpg -> mycafe_emenu/file
            var uri = new Uri(imageUrl);
            var path = uri.AbsolutePath; // /v123/mycafe_emenu/file.jpg
            var startIndex = path.IndexOf("mycafe_emenu");
            if (startIndex == -1) return;

            var publicIdWithExt = path.Substring(startIndex); // mycafe_emenu/file.jpg
            var publicId = Path.ChangeExtension(publicIdWithExt, null); // mycafe_emenu/file

            var cloudinary = GetCloudinary();
            var deletionParams = new CloudinaryDotNet.Actions.DeletionParams(publicId);
            cloudinary.Destroy(deletionParams);
            Console.WriteLine($"[Cloudinary] Deleted: {publicId}");
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[Cloudinary Error] Could not delete {imageUrl}: {ex.Message}");
        }
    }
}
