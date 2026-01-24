using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Render/Heroku dynamic port binding
var port = Environment.GetEnvironmentVariable("PORT") ?? "5238";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

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
    var connString = Environment.GetEnvironmentVariable("DATABASE_URL")
                     ?? builder.Configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrEmpty(connString))
    {
        // Fallback for empty/null connection string during local development
        connString = "Host=localhost;Database=postgres"; 
    }

    if (connString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(connString);
        var userInfo = uri.UserInfo.Split(':');

        var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Username = userInfo[0],
            Password = userInfo[1],
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = Npgsql.SslMode.Require,
            TrustServerCertificate = true,
            // Critical for PgBouncer Transaction Mode
            MaxAutoPrepare = 0
        };
        connString = connBuilder.ToString();
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
            // 30 Years Experience: Migrate is safer for cloud DBs than EnsureCreated
            db.Database.Migrate(); 
            
            try 
            {
               Console.WriteLine("[SCHEMA PATCH] Attempting to add discount_amount...");
               db.Database.ExecuteSqlRaw("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number SERIAL;");
               db.Database.ExecuteSqlRaw("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) DEFAULT 0;");
               Console.WriteLine("[SCHEMA PATCH] Success!");
            } 
            catch (Exception ex) { Console.WriteLine($"[SCHEMA PATCH ERROR] {ex.Message}"); }

            // PATCH: Create billiard_sessions table for existing databases
            try
            {
                var createBilliardTableSql = @"
                    CREATE TABLE IF NOT EXISTS billiard_sessions (
                        id UUID PRIMARY KEY,
                        table_id INT,
                        guest_name VARCHAR(100) NOT NULL,
                        num_people INT NOT NULL DEFAULT 2,
                        price_per_hour DECIMAL(18, 2) NOT NULL,
                        start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        end_time TIMESTAMP WITH TIME ZONE,
                        total_amount DECIMAL(18, 2) DEFAULT 0,
                        status VARCHAR(20) DEFAULT 'ACTIVE'
                    );";
                db.Database.ExecuteSqlRaw(createBilliardTableSql);
            }
            catch (Exception ex) 
            {
                Console.WriteLine($"[PATCH WARNING] Could not create billiard_sessions: {ex.Message}");
            }

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

            // 2. Seed Initial Tables (Fixed Configuration: 4 Billiard, 10 Cafe, 1 Takeaway)
            
            // A. Billiard Tables (BI-01 to BI-04) - "4 ban bia"
            if (!db.Tables.Any(t => t.Alias == "Bi-a"))
            {
                var tables = new List<Table>();
                for (int i = 1; i <= 4; i++)
                {
                    tables.Add(new Table { TableNumber = $"BI-{i:00}", Name = $"Bàn Bida {i:00}", Status = "Empty", Alias = "Bi-a" });
                }
                db.Tables.AddRange(tables);
                Console.WriteLine("✅ Added 4 Billiard Tables");
            }

            // B. Cafe Tables (01 to 10) - "1 den 10 ban cafe"
            if (!db.Tables.Any(t => t.TableNumber == "01" && t.Alias == "Cafe"))
            {
                // Check if old "01" exists without Alias, if so, update them? 
                // Simpler: Just add if missing. If collision on TableNumber (unique constraint?), we might fail.
                // Assuming empty DB or clean state as user said "ngay tu ban dau".
                // But for robust patching:
                for (int i = 1; i <= 10; i++)
                {
                    var num = $"{i:00}";
                    if (!db.Tables.Any(t => t.TableNumber == num))
                    {
                        db.Tables.Add(new Table { TableNumber = num, Name = $"Bàn {i}", Status = "Empty", Alias = "Cafe" });
                    }
                }
                Console.WriteLine("✅ Verified 10 Cafe Tables");
            }

            // C. Takeaway Table (11) - "ban 11 la mang ve"
            if (!db.Tables.Any(t => t.TableNumber == "11"))
            {
                db.Tables.Add(new Table { TableNumber = "11", Name = "Mang về", Status = "Empty", Alias = "Takeaway" });
                Console.WriteLine("✅ Added Takeaway Table (11)");
            }
            else
            {
                // Verify alias update if it exists but wrong alias
                var t11 = db.Tables.FirstOrDefault(t => t.TableNumber == "11");
                if (t11 != null && t11.Alias != "Takeaway")
                {
                    t11.Name = "Mang về";
                    t11.Alias = "Takeaway";
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
