using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure CORS to allow frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Configure PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    // Parse Render/Heroku style URL: postgres://user:password@host:port/database
    // Parse Render/Heroku style URL: postgres://user:password@host:port/database
    if (connString != null)
    {
        Console.WriteLine($"[DB] Connection String found: {connString.Substring(0, Math.Min(connString.Length, 15))}...");
        
        if (connString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
            connString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("[DB] Detected URI format. Parsing...");
            try 
            {
                var databaseUri = new Uri(connString);
                var userInfo = databaseUri.UserInfo.Split(':');
                var port = databaseUri.Port > 0 ? databaseUri.Port : 5432;
                var builder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = databaseUri.Host,
                    Port = port,
                    Username = userInfo[0],
                    Password = userInfo[1],
                    Database = databaseUri.LocalPath.TrimStart('/'),
                    SslMode = Npgsql.SslMode.Prefer,
                    TrustServerCertificate = true 
                };
                connString = builder.ToString();
                Console.WriteLine($"[DB] Successfully parsed URI. Host: {databaseUri.Host}, Port: {port}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing connection URL: {ex.Message}");
            }
        }
    }

    options.UseNpgsql(connString);
});

    // Configure Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
        app.UseSwagger();
        app.UseSwaggerUI(); // /swagger
    }

    app.UseCors("AllowAll");
    app.UseStaticFiles(); 
    app.MapControllers();
    app.MapFallbackToFile("index.html");

    // Ensure DB is created & Seed Data
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var db = services.GetRequiredService<AppDbContext>();
            // db.Database.EnsureDeleted(); // RESET DB REQUESTED
            db.Database.EnsureCreated();
            
            // PATCH: Add order_number for existing databases
            try 
            {
               db.Database.ExecuteSqlRaw("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number SERIAL;");
            } 
            catch { /* Ignore if fails or column exists */ }

            // 1. Seed Users
            if (!db.Users.Any())
            {
                db.Users.Add(new User { Username = "thang", Password = "admin123", Role = "ADMIN" });
                db.Users.Add(new User { Username = "admin", Password = "admin123", Role = "ADMIN" });
            }
            else if (!db.Users.Any(u => u.Username == "admin"))
            {
                 db.Users.Add(new User { Username = "admin", Password = "admin123", Role = "ADMIN" });
            }

            // 2. Seed Custom Data (Tables/Categories) if DB is empty
            if (!db.Tables.Any())
            {
                // 1. Insert tables 1-10 first (IDs 1-10)
                var tables = new List<Table>();
                for (int i = 1; i <= 10; i++)
                {
                    tables.Add(new Table { TableNumber = i.ToString("00"), Name = $"Bàn {i}", Status = "Empty" });
                }
                db.Tables.AddRange(tables);
                db.SaveChanges(); // Force IDs 1-10

                // 2. Insert Mang Ve (ID 11)
                db.Tables.Add(new Table { TableNumber = "MV", Name = "Mang về", Status = "Empty", Alias = "Takeaway" });
                db.SaveChanges(); // Force ID 11
            }
            else
            {
                // Ensure Takeaway table exists even if other tables were already created
                var hasTakeaway = db.Tables.Any(t => t.Alias == "Takeaway" || t.TableNumber == "MV");
                if (!hasTakeaway)
                {
                    db.Tables.Add(new Table { TableNumber = "MV", Name = "Mang về", Status = "Empty", Alias = "Takeaway" });
                    Console.WriteLine("✅ Added missing 'Mang về' (Takeaway) table");
                }
            }

            if (!db.Categories.Any())
            {
                var c1 = new Category { Name = "Cà phê" };
                var c2 = new Category { Name = "Trà sữa" };
                var c3 = new Category { Name = "Ăn vặt" };
                db.Categories.AddRange(c1, c2, c3);
                
                // Save first to get IDs if needed, or just AddRange items
                // But simplified:
                if (!db.MenuItems.Any())
                {
                    db.MenuItems.AddRange(
                        new MenuItem { Category = c1, Name = "Cà phê đen", Price = 25000, IsActive = true, Description = "Đậm đà" },
                        new MenuItem { Category = c1, Name = "Cà phê sữa", Price = 30000, IsActive = true, Description = "Sữa đặc" },
                        new MenuItem { Category = c2, Name = "Trà sữa thái", Price = 35000, IsActive = true, Description = "Thơm ngon" }
                    );
                }
            }

            db.SaveChanges();
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("CRITICAL ERROR DURING STARTUP:");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");
            Console.WriteLine(ex.StackTrace);
            Console.ResetColor();
            throw; 
        }
    }

app.Run();
