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
