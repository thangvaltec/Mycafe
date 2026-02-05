# Hướng dẫn Tối ưu Khởi động Database (Startup Optimization)

Tài liệu này giải thích tại sao hệ thống có thể khởi động chậm trên các gói dịch vụ miễn phí (Render/Supabase) và cung cấp phương án tối ưu để sử dụng sau này.

## 1. Vấn đề hiện tại
Trong file `Program.cs`, hệ thống thực hiện kiểm tra cấu trúc database mỗi khi khởi động bằng cách gửi khoảng 15 lệnh SQL riêng biệt (`ExecuteSqlRaw`). 

**Tại sao chậm trên gói Free?**
*   **Cold Start:** Backend và Database mất 30-60 giây để "thức dậy".
*   **Connection Limit:** Gói Free giới hạn số kết nối thấp (thường là 2-3). Việc gửi 15 lệnh liên tục gây ra tình trạng xếp hàng (queue), khiến lệnh đăng nhập bị chậm hoặc Timeout.

## 2. Phương án Tối ưu (Sẽ áp dụng sau)

Khi hệ thống đã chạy ổn định và anh/chị không cần thêm bảng/cột mới, hãy thực hiện đổi đoạn code trong `Program.cs` theo hướng bên dưới.

### Bước A: Gộp các lệnh SQL
Thay vì gửi 15 lần, chúng ta gộp toàn bộ lệnh `CREATE TABLE` và `ALTER TABLE` vào trong một chuối String duy nhất để gửi đi **duy nhất 1 lần**.

### Bước B: Đoạn code đề xuất
Thay thế khối `try { ... }` bên trong `using (var scope = app.Services.CreateScope())` bằng đoạn code gọn nhẹ sau:

```csharp
// ĐOẠN CODE TỐI ƯU GỢI Ý
try {
    Console.WriteLine("[DB INIT] Optimizing startup...");
    
    // Gộp tất cả các lệnh kiểm tra cấu trúc vào 1 lần thực thi duy nhất
    db.Database.ExecuteSqlRaw(@"
        -- 1. Đảm bảo Core Tables
        CREATE TABLE IF NOT EXISTS users (...);
        CREATE TABLE IF NOT EXISTS categories (...);
        -- ... (các bảng khác)

        -- 2. Đảm bảo Columns
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) DEFAULT 0;
        -- ... (các cột khác)

        -- 3. Dọn dẹp dữ liệu rác
        UPDATE tables SET is_occupied = false, status = 'Empty' 
        WHERE current_order_id IS NULL AND is_occupied = true;
    ");

    Console.WriteLine("[DB INIT] Rapid check completed.");
} catch (Exception ex) { 
    Console.WriteLine($"[DB INIT ERROR] {ex.Message}"); 
}
```

## 3. Lợi ích sau khi tối ưu
*   **Tốc độ:** Giảm thời gian kiểm tra từ 5-10 giây xuống còn < 1 giây.
*   **Ổn định:** Giảm thiểu tối đa lỗi "Login Timeout" do Backend bị nghẽn kết nối ngay khi vừa khởi động.
*   **Tiết kiệm:** Giảm số lượng "Requests" gửi tới Database, giúp duy trì dưới hạn định mức của gói Free.

---
**Ghi chú:** Anh/chị hãy giữ tài liệu này. Khi nào cảm thấy hệ thống đã quá chậm và khó chịu, hãy yêu cầu em: *"Áp dụng tối ưu DB theo tài liệu trong docs"* ạ!
