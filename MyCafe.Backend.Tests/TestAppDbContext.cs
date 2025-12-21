using Microsoft.EntityFrameworkCore;
using MyCafe.Backend.Data;
using MyCafe.Backend.Models;

namespace MyCafe.Backend.Tests
{
    public class TestAppDbContext : AppDbContext
    {
        public TestAppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // SQLite workaround: Disable generation for OrderNumber since we provide it manually in tests.
            // Since it is now nullable int?, ValueGeneratedNever ensures EF Core sends our value.
            modelBuilder.Entity<Order>()
                .Property(o => o.OrderNumber)
                .ValueGeneratedNever();
        }
    }
}
