using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace MyCafe.Backend.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("password")]
    public string Password { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("role")]
    public string Role { get; set; } = "ADMIN";
}

[Table("tables")]
public class Table
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("table_number")]
    public string? TableNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("alias")]
    public string? Alias { get; set; }

    [MaxLength(100)]
    [Column("guest_name")]
    public string? GuestName { get; set; }

    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Empty"; // Empty, Ordering, Paid

    [Column("is_occupied")]
    public bool IsOccupied { get; set; } = false;

    [Column("current_order_id")]
    public Guid? CurrentOrderId { get; set; }
}

[Table("categories")]
public class Category
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
}

[Table("menu_items")]
public class MenuItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [ForeignKey("CategoryId")]
    public Category? Category { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("price")]
    public decimal Price { get; set; }

    [MaxLength(500)]
    [Column("image_path")]
    public string? ImagePath { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("description")]
    public string? Description { get; set; }
}

[Table("orders")]
public class Order
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("table_id")]
    public int? TableId { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("order_number")]
    public int? OrderNumber { get; set; }

    [ForeignKey("TableId")]
    public Table? Table { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "NEW"; // NEW, PROCESSING, COMPLETED, PAID, CANCELLED

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(20)]
    [Column("payment_method")]
    public string? PaymentMethod { get; set; } // bank_transfer, cash

    [Column("payment_amount")]
    public decimal? PaymentAmount { get; set; }

    [Column("change_amount")]
    public decimal? ChangeAmount { get; set; }

    [Column("discount_amount")]
    [JsonPropertyName("discountAmount")]
    public decimal Discount { get; set; } = 0;

    public List<OrderItem> Items { get; set; } = new();
}

[Table("order_items")]
public class OrderItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("order_id")]
    public Guid OrderId { get; set; }

    [JsonIgnore]
    [ForeignKey("OrderId")]
    public Order? Order { get; set; }

    [Column("product_id")]
    public Guid? ProductId { get; set; }

    [ForeignKey("ProductId")]
    public MenuItem? Product { get; set; }

    [MaxLength(200)]
    [Column("product_name")]
    public string? ProductName { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }
}

[Table("payments")]
public class Payment
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("order_id")]
    public Guid? OrderId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("received_amount")]
    public decimal? ReceivedAmount { get; set; }

    [Column("change_amount")]
    public decimal? ChangeAmount { get; set; }

    [Column("paid_at")]
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}

[Table("expenses")]
public class Expense
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("date")]
    public DateTime Date { get; set; } = DateTime.UtcNow;
}

[Table("billiard_sessions")]
public class BilliardSession
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("table_id")]
    public int TableId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("guest_name")]
    public string GuestName { get; set; } = string.Empty;

    [Column("num_people")]
    public int NumPeople { get; set; } = 2;

    [Column("price_per_hour")]
    public decimal PricePerHour { get; set; }

    [Column("start_time")]
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    [Column("end_time")]
    public DateTime? EndTime { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, PAID
}

[Table("invoices")]
public class Invoice
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("table_id")]
    public int TableId { get; set; }

    [Column("billiard_session_id")]
    public Guid? BilliardSessionId { get; set; }

    [Column("order_id")]
    public Guid? OrderId { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [MaxLength(50)]
    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [Required]
    [MaxLength(200)]
    [Column("identify_string")]
    public string IdentifyString { get; set; } = string.Empty; // e.g. "Table BI-01 (10:00 - 12:00)"

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("discount")]
    [JsonPropertyName("discountAmount")]
    public decimal Discount { get; set; } = 0;

    public List<InvoiceItem> Items { get; set; } = new();
}

[Table("invoice_items")]
public class InvoiceItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("invoice_id")]
    public Guid InvoiceId { get; set; }

    [JsonIgnore]
    [ForeignKey("InvoiceId")]
    public Invoice? Invoice { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; }

    [Column("total_price")]
    public decimal TotalPrice { get; set; }

    [MaxLength(50)]
    [Column("type")]
    public string Type { get; set; } = "ITEM"; // ITEM, TIME_FEE, SERVICE
}
