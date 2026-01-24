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
            // Critical for PgBouncer Transaction Mode (Port 6543)
            MaxAutoPrepare = 0,
            Pooling = false 
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
            
            // 30 Years Experience: When Migrations clash on Cloud DBs, Manual 'IF NOT EXISTS' is king
            try 
            {
                Console.WriteLine("[DB INIT] Ensuring tables exist...");
                db.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username VARCHAR(50) NOT NULL, password VARCHAR(100) NOT NULL, role VARCHAR(20) DEFAULT 'ADMIN');
                    CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY, name VARCHAR(100) NOT NULL);
                    CREATE TABLE IF NOT EXISTS tables (id SERIAL PRIMARY KEY, table_number TEXT, name VARCHAR(50) NOT NULL, alias VARCHAR(100), guest_name VARCHAR(100), status VARCHAR(20) DEFAULT 'Empty', is_occupied BOOLEAN DEFAULT FALSE, current_order_id UUID);
                    CREATE TABLE IF NOT EXISTS menu_items (id UUID PRIMARY KEY, category_id UUID REFERENCES categories(id), name VARCHAR(200) NOT NULL, price DECIMAL(18,2) NOT NULL, image_path VARCHAR(500), is_active BOOLEAN DEFAULT TRUE, description TEXT);
                    CREATE TABLE IF NOT EXISTS orders (id UUID PRIMARY KEY, table_id INT REFERENCES tables(id), order_number SERIAL, status VARCHAR(20) DEFAULT 'NEW', total_amount DECIMAL(18,2) DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, payment_method VARCHAR(20), payment_amount DECIMAL(18,2), change_amount DECIMAL(18,2), discount_amount DECIMAL(18,2) DEFAULT 0);
                    CREATE TABLE IF NOT EXISTS order_items (id UUID PRIMARY KEY, order_id UUID REFERENCES orders(id) ON DELETE CASCADE, product_id UUID REFERENCES menu_items(id), product_name VARCHAR(200), price DECIMAL(18,2) NOT NULL, quantity INT NOT NULL);
                    CREATE TABLE IF NOT EXISTS billiard_sessions (id UUID PRIMARY KEY, table_id INT, guest_name VARCHAR(100) NOT NULL, num_people INT DEFAULT 2, price_per_hour DECIMAL(18,2) NOT NULL, start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, end_time TIMESTAMP WITH TIME ZONE, total_amount DECIMAL(18,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'ACTIVE');
                    CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY, table_id INT NOT NULL, billiard_session_id UUID, order_id UUID, total_amount DECIMAL(18,2) DEFAULT 0, payment_method VARCHAR(50) DEFAULT 'cash', identify_string VARCHAR(200) NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, discount DECIMAL(18,2) DEFAULT 0);
                    CREATE TABLE IF NOT EXISTS invoice_items (id UUID PRIMARY KEY, invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, quantity INT DEFAULT 1, unit_price DECIMAL(18,2) NOT NULL, total_price DECIMAL(18,2) NOT NULL, type VARCHAR(50) DEFAULT 'ITEM');
                    CREATE TABLE IF NOT EXISTS expenses (id UUID PRIMARY KEY, description TEXT NOT NULL, amount DECIMAL(18,2) NOT NULL, date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
                ");
                
                // Patch for missing columns from older versions
                db.Database.ExecuteSqlRaw("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) DEFAULT 0;");
                db.Database.ExecuteSqlRaw("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount DECIMAL(18,2) DEFAULT 0;");
                Console.WriteLine("[DB INIT] Schema verified.");
            } 
            catch (Exception ex) { Console.WriteLine($"[DB INIT ERROR] {ex.Message}"); }

            // 1. Seed Users
            if (!db.Users.Any())
            {
                db.Users.Add(new User { Username = "thang", Password = "admin123", Role = "ADMIN" });
                db.Users.Add(new User { Username = "admin", Password = "admin123", Role = "ADMIN" });
                db.Users.Add(new User { Username = "staff", Password = "staff123", Role = "STAFF" });
            }
            else 
            {
                 if (!db.Users.Any(u => u.Username == "admin"))
                    db.Users.Add(new User { Username = "admin", Password = "admin123", Role = "ADMIN" });
                 if (!db.Users.Any(u => u.Username == "staff"))
                    db.Users.Add(new User { Username = "staff", Password = "staff123", Role = "STAFF" });
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
