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
            // AGGRESSIVE Configuration for Supabase Free Tier
            // Port 6543 = Transaction Mode (No Pooling, No AutoPrepare)
            // Port 5432 = Session Mode (MUST LIMIT POOL SIZE AGGRESSIVELY)
            Pooling = uri.Port == 5432,
            MaxPoolSize = uri.Port == 5432 ? 2 : 0, // Reverted to 2 for better performance - user will minimize logins
            MinPoolSize = 0, // Don't keep idle connections
            ConnectionLifetime = 300, // 5 minutes - Force connection refresh to prevent stale connections
            ConnectionIdleLifetime = 60, // Close idle connections after 60 seconds
            MaxAutoPrepare = uri.Port == 5432 ? 10 : 0, // Reduced from 20 to save memory
            Timeout = 60, // Connection timeout: 60 seconds (was default 15s)
            CommandTimeout = 60 // Command timeout: 60 seconds
        };
        connString = connBuilder.ToString();
    }

    options.UseNpgsql(connString, npgsqlOptions => {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 15, // Increased retry count for slow cold starts
            maxRetryDelay: TimeSpan.FromSeconds(60), // Increased delay to 60s
            errorCodesToAdd: null
        );
        npgsqlOptions.CommandTimeout(60); // Prevent long hanging queries - increased to 60s
    });
});

    // Configure Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    app.UseSwagger();
    app.UseSwaggerUI(c => {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MyCafe API V1");
        c.RoutePrefix = "swagger"; // Swagger will be at /swagger
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
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
                
                // ----------------------------------------------

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
                    CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY, order_id UUID, payment_method VARCHAR(20) DEFAULT 'cash', amount DECIMAL(18,2) NOT NULL, received_amount DECIMAL(18,2), change_amount DECIMAL(18,2), paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
                    CREATE TABLE IF NOT EXISTS expenses (id UUID PRIMARY KEY, description TEXT NOT NULL, amount DECIMAL(18,2) NOT NULL, date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
                ");
                
                // Patch for missing columns from older versions
                db.Database.ExecuteSqlRaw("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) DEFAULT 0;");
                db.Database.ExecuteSqlRaw("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount DECIMAL(18,2) DEFAULT 0;");
                db.Database.ExecuteSqlRaw("ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;");
                db.Database.ExecuteSqlRaw("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;");
                
                // Fix: Sanitize inconsistent table states on startup (Ghost Occupied Tables)
                db.Database.ExecuteSqlRaw("UPDATE tables SET is_occupied = false, status = 'Empty' WHERE current_order_id IS NULL AND is_occupied = true;");
                
                // CRITICAL FIX: Clean up duplicate active orders (keep oldest, cancel rest)
                Console.WriteLine("[DB INIT] Cleaning up duplicate active orders...");
                var duplicatesFixed = db.Database.ExecuteSqlRaw(@"
                    UPDATE orders
                    SET status = 'CANCELLED'
                    WHERE id IN (
                        SELECT id FROM (
                            SELECT id, ROW_NUMBER() OVER (
                                PARTITION BY table_id 
                                ORDER BY created_at ASC
                            ) as rn
                            FROM orders
                            WHERE status NOT IN ('PAID', 'CANCELLED')
                        ) sub
                        WHERE rn > 1
                    );
                ");
                if (duplicatesFixed > 0) Console.WriteLine($"[DB INIT] Cancelled {duplicatesFixed} duplicate orders");
                
                // FIX: Sync table.CurrentOrderId for tables with active orders but null CurrentOrderId
                Console.WriteLine("[DB INIT] Syncing table CurrentOrderId...");
                var syncedTables = db.Database.ExecuteSqlRaw(@"
                    UPDATE tables t
                    SET current_order_id = o.id,
                        is_occupied = true,
                        status = 'Ordering'
                    FROM orders o
                    WHERE o.table_id = t.id
                      AND o.status NOT IN ('PAID', 'CANCELLED')
                      AND t.current_order_id IS NULL;
                ");
                if (syncedTables > 0) Console.WriteLine($"[DB INIT] Synced {syncedTables} tables with active orders");
                
                Console.WriteLine("[DB INIT] Schema verified.");
            } 
            catch (Exception ex) { Console.WriteLine($"[DB INIT ERROR] {ex.Message}"); }
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
