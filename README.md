# HƯỚNG DẪN VẬN HÀNH & CẬP NHẬT (MYCAFE)
db supabase git 
frontend vercel git
backend api render git
phanthangvaltec@gmail.com Txxxx1xxx@
Dưới đây là các câu lệnh cần thiết để chạy lại dự án sau khi bạn sửa code.

## 1. Phần Giao Diện (Frontend)
Thư mục gốc: `Mycafe/`

*   **Chạy thử nghiệm (Chế độ Dev)**
    *   Lệnh: `npm run dev`
    *   *Tác dụng*: Khi bạn sửa code và lưu, web sẽ tự cập nhật ngay lập tức không cần chạy lại. 
    *   *Lưu ý*: Lệnh này cần cửa sổ CMD luôn mở.

*   **Đóng gói sản phẩm (Chế độ Production/Deploy)**
    *   Lệnh: `npm run build`
    *   *Tác dụng*: Tạo ra thư mục `dist/` chứa trang web hoàn chỉnh. Bạn dùng thư mục này để ném lên host (như Render, Vercel...).

## 2. Phần Máy Chủ (Backend)
Thư mục: `Mycafe/MyCafe.Backend/`

*   **Chạy máy chủ (Chế độ Dev)**
    *   Lệnh: `dotnet run --urls=http://0.0.0.0:5238` (Chạy lệnh này từ thư mục `MyCafe.Backend`)
    *   *Hoặc*: `dotnet run --project MyCafe.Backend --urls=http://0.0.0.0:5238` (Chạy từ thư mục gốc `Mycafe`)
    *   *Lưu ý*: Nếu bạn sửa Code C# (.cs), bạn thường phải tắt đi (Ctrl+C) và chạy lại lệnh này.
    *   *Mẹo*: Dùng `dotnet watch run --urls=http://0.0.0.0:5238` để tự động chạy lại khi sửa code.

*   **Đóng gói máy chủ (Chế độ Production)**
    *   Lệnh: `dotnet publish -c Release`
    *   *Tác dụng*: Tạo ra file `.exe` hoặc `dll` để chạy trên máy chủ thật mà không cần cài Source Code.

## ⚠️ Lưu Ý Quan Trọng
*   **IP Tự Động**: Hệ thống đã được cấu hình để tự nhận diện IP. Khi mang sang máy khác, chỉ cần chạy lên là dùng được ngay, không cần sửa đổi cấu hình IP.
*   **Chạy xong nhớ kiểm tra**: Luôn đảm bảo cả 2 cửa sổ (Frontend + Backend) đều đang chạy và không báo lỗi đỏ.

---
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1DL_Gf93_w_nlrJv0BoUIjfSNbtdlxsw_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Frontend Screen to Database Table Mapping

| Màn Hình (Frontend Component) | Chức Năng Chính | Các Bảng Database Tương Ứng (Table) |
| :--- | :--- | :--- |
| **AdminBilliard.tsx** (Màn hình Bida) | Quản lý bàn, giờ chơi, mở bàn, tính tiền giờ. | `Tables`<br>`BilliardSessions`<br>`Orders`<br>`OrderItems`<br>`Invoices` (Khi thanh toán) |
| **AdminOrders.tsx** (Màn hình Phục vụ) | Xem danh sách món đã gọi theo bàn, thanh toán món ăn. | `Orders`<br>`OrderItems`<br>`Tables`<br>`Invoices` (Khi thanh toán) |
| **AdminMenu.tsx** (Quản lý Menu) | Thêm, sửa, xóa món ăn, danh mục. | `MenuItems`<br>`Categories` |
| **AdminExpenses.tsx** (Quản lý Chi tiêu) | Nhập và xem báo cáo chi tiêu quán. | `Expenses` |
| **AdminReport.tsx** (Báo cáo Doanh thu) | Xem tổng hợp doanh thu, lịch sử hóa đơn. | `Invoices` (Chính)<br>`InvoiceItems`<br>`BilliardSessions`<br>`Orders` |
| **AdminKitchen.tsx** (Màn hình Bếp) | Xem các món cần chế biến. | `Orders` (Lọc trạng thái)<br>`OrderItems` |
| **AdminPOS.tsx** (Màn hình Bán hàng) | (Dự phòng/Tính năng cũ) Bán hàng tại quầy. | `Products` (hoặc `MenuItems`)<br>`Orders`<br>`OrderItems` |
| **AdminTakeaway.tsx** (Màn hình Mang về) | Quản lý đơn mang về. | `Orders` (Loại mang về)<br>`OrderItems` |
