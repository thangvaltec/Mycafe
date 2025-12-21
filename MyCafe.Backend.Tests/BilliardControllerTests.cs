using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Controllers;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Data.Sqlite;

namespace MyCafe.Backend.Tests
{
    public class BilliardControllerTests : IDisposable
    {
        private readonly SqliteConnection _connection;

        public BilliardControllerTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        private TestAppDbContext GetContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;
            var context = new TestAppDbContext(options);
            context.Database.EnsureCreated();
            return context;
        }

        [Fact]
        public async Task Checkout_Success_CalculatesTotalCorrectly()
        {
            // Arrange
            using var context = GetContext();
            
            var tableId = 1;
            var startTime = DateTime.UtcNow.AddHours(-2); // 2 hours duration
            var pricePerHour = 50000m;
            
            // Seed Session
            context.Tables.Add(new Table { Id = tableId, TableNumber = "BI-01", Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession
            {
                Id = Guid.NewGuid(),
                TableId = tableId,
                StartTime = startTime,
                PricePerHour = pricePerHour,
                Status = "ACTIVE"
            });

            // Seed Order
            var orderId = Guid.NewGuid();
            context.Orders.Add(new Order
            {
                Id = orderId,
                TableId = tableId,
                OrderNumber = 100,
                Status = "PROCESSING",
                Items = new List<OrderItem>
                {
                    new OrderItem { ProductId = Guid.NewGuid(), ProductName = "Coffee", Price = 20000, Quantity = 2 }, // 40k
                    new OrderItem { ProductId = Guid.NewGuid(), ProductName = "Snack", Price = 10000, Quantity = 1 }   // 10k
                }
            });
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);
            var request = new BilliardCheckoutRequest { PaymentMethod = "cash" };

            // Act
            var result = await controller.Checkout(tableId, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var invoice = Assert.IsType<Invoice>(okResult.Value);

            // Time Fee: 2h * 50k = 100,000. 
            // Menu: (2*20k) + (1*10k) = 50,000.
            // Total: 150,000.
            var expectedTimeFee = 100000m;
            var expectedMenuFee = 50000m;
            
            Assert.Equal(expectedTimeFee + expectedMenuFee, invoice.TotalAmount);
            Assert.Contains(invoice.Items, i => i.Type == "TIME_FEE" && i.TotalPrice == expectedTimeFee);
            Assert.Contains(invoice.Items, i => i.Type == "MENU_ITEM" && i.TotalPrice == 40000);
        }

        [Fact]
        public async Task Checkout_DatabasePersistence_CreatesInvoice()
        {
            // Arrange
            using var context = GetContext();
            var tableId = 2;
            context.Tables.Add(new Table { Id = tableId, Name = "T2", Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession
            {
                TableId = tableId, StartTime = DateTime.UtcNow.AddHours(-1), PricePerHour = 60000, Status = "ACTIVE"
            });
            await context.SaveChangesAsync();
            
            var controller = new BilliardController(context);

            // Act
            await controller.Checkout(tableId, new BilliardCheckoutRequest());

            // Assert
            var invoice = await context.Invoices.Include(i => i.Items).FirstOrDefaultAsync();
            Assert.NotNull(invoice);
            Assert.Equal(tableId, invoice.TableId);
            Assert.Single(context.Invoices);
        }

        [Fact]
        public async Task Checkout_StatusUpdate_ResetsTableAndSession()
        {
            // Arrange
            using var context = GetContext();
            var tableId = 3;
            var session = new BilliardSession { Id = Guid.NewGuid(), TableId = tableId, StartTime = DateTime.UtcNow, Status = "ACTIVE" };
            var table = new Table { Id = tableId, Status = "Occupied", CurrentOrderId = Guid.NewGuid(), GuestName = "Guest" };
            
            context.BilliardSessions.Add(session);
            context.Tables.Add(table);
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);

            // Act
            await controller.Checkout(tableId, new BilliardCheckoutRequest());

            // Assert
            var updatedTable = await context.Tables.FindAsync(tableId);
            var updatedSession = await context.BilliardSessions.FindAsync(session.Id);

            Assert.Equal("Empty", updatedTable.Status);
            Assert.Null(updatedTable.CurrentOrderId);
            Assert.Null(updatedTable.GuestName);
            Assert.Equal("PAID", updatedSession.Status);
            Assert.NotNull(updatedSession.EndTime);
        }

        [Fact]
        public async Task Checkout_ZeroDuration_HandlesSafely()
        {
            // Arrange
            using var context = GetContext();
            var tableId = 4;
            // Start time = Now (Zero duration)
            context.Tables.Add(new Table { Id = tableId, Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession
            {
                TableId = tableId, StartTime = DateTime.UtcNow, PricePerHour = 100000, Status = "ACTIVE"
            });
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);

            // Act
            var result = await controller.Checkout(tableId, new BilliardCheckoutRequest());

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var invoice = Assert.IsType<Invoice>(okResult.Value);
            
            // Should be 0 or small amount depending on rounding. 
            // My implementation: Math.Ceiling(... / 1000) * 1000.
            // Even micro-seconds result in rounding up to 1000.
            Assert.Equal(1000, invoice.TotalAmount);
            Assert.Equal("PAID", (await context.BilliardSessions.FirstAsync()).Status);
        }

        [Fact]
        public async Task Checkout_ConcurrentOrders_IncludesLatestItems()
        {
            // Arrange
            using var context = GetContext();
            var tableId = 5;
            context.Tables.Add(new Table { Id = tableId, Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession { TableId = tableId, StartTime = DateTime.UtcNow.AddHours(-1), Status = "ACTIVE" });
            var order = new Order { Id = Guid.NewGuid(), TableId = tableId, OrderNumber = 200, Status = "PROCESSING", Items = new List<OrderItem>() };
            context.Orders.Add(order);
            await context.SaveChangesAsync();

            // Simulate Concurrent Add: Add item to the order BEFORE calling checkout but after initial seed
            // In a real scenario, this would be a race condition, but here we just verify that if it's in DB, Checkout picks it up.
            var newItem = new OrderItem { ProductId = Guid.NewGuid(), ProductName = "Late Item", Price = 50000, Quantity = 1 };
            order.Items.Add(newItem);
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);

            // Act
            var result = await controller.Checkout(tableId, new BilliardCheckoutRequest());

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var invoice = Assert.IsType<Invoice>(okResult.Value);

            Assert.Contains(invoice.Items, i => i.Name == "Late Item" && i.TotalPrice == 50000);
        }

        [Fact]
        public async Task Checkout_EmptyTable_NoFoodOrders_Success()
        {
            // Arrange
            using var context = GetContext();
            var tableId = 6;
            context.Tables.Add(new Table { Id = tableId, Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession { TableId = tableId, StartTime = DateTime.UtcNow.AddMinutes(-55), PricePerHour = 10000, Status = "ACTIVE" });
            // NO Order added
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);

            // Act
            var result = await controller.Checkout(tableId, new BilliardCheckoutRequest());

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var invoice = Assert.IsType<Invoice>(okResult.Value);
            
            // Verify Logic didn't crash on null order
            Assert.NotNull(invoice);
            Assert.Equal(10000, invoice.TotalAmount); // Only time fee
            Assert.All(invoice.Items, i => Assert.Equal("TIME_FEE", i.Type));
        }

        [Fact]
        public async Task GetBill_PriceChange_SnapshotIntegrity()
        {
             // NOTE: GetBill is a Preview. The Invoice data persistence is tested in Checkout_DatabasePersistence.
             // This test scenario (Test Case 7) asks: "if a menu item's price changes AFTER an invoice is generated..."
             // So this is actually a Checkout test -> Modify Data -> Verify Invoice Unchanged.
             
             // Arrange
            using var context = GetContext();
            var tableId = 7;
            
            // Product with Price 20k
            // But OrderItem stores Price too (Snapshot 1). InvoiceItem stores Price (Snapshot 2).
            // We simulate: Checkout happens with Price 20k.
            
            context.Tables.Add(new Table { Id = tableId, Status = "Occupied" });
            context.BilliardSessions.Add(new BilliardSession { TableId = tableId, StartTime = DateTime.UtcNow, Status = "ACTIVE" });
            context.Orders.Add(new Order 
            { 
                TableId = tableId, 
                OrderNumber = 300,
                Status = "PROCESSING", 
                Items = new List<OrderItem> { new OrderItem { ProductId = Guid.NewGuid(), ProductName = "Tea", Price = 20000, Quantity = 1 } } 
            });
            await context.SaveChangesAsync();

            var controller = new BilliardController(context);
            
            // Act 1: Checkout
            await controller.Checkout(tableId, new BilliardCheckoutRequest());
            
            // Act 2: "Price Change" - In our system, OrderItem has the price. 
            // Realistically, if we had a Products table and updated it, it shouldn't affect the InvoiceItem.
            // Since InvoiceItem copies the value, we can verify it's decoupled.
            // We will modify the OrderItem price (which shouldn't happen for a PAID order, but let's say we do) or verify Invoice is isolated.
            
            var invoice = await context.Invoices.Include(i => i.Items).FirstAsync();
            var originalPrice = invoice.Items.First(i => i.Name == "Tea").UnitPrice;
            
            // Simulate changing the source (if we fetched from Products, we'd change Product.Price).
            // Here we just verify the saved value is 20000.
            
            Assert.Equal(20000, originalPrice);
            
            // If we manually change the OrderItem now
            var orderItem = await context.OrderItems.FirstAsync();
            orderItem.Price = 99999;
            await context.SaveChangesAsync();
            
            // Reload Invoice
            var reloadedInvoice = await context.Invoices.Include(i => i.Items).AsNoTracking().FirstAsync();
            Assert.Equal(20000, reloadedInvoice.Items.First(i => i.Name == "Tea").UnitPrice); // Should remain 20k
        }
    }
}
