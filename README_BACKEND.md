# MyCafe System - Backend Setup & Instructions

This project consists of a .NET 8 Web API backend and a React frontend. The backend manages tables, orders, menu items, and reporting using a PostgreSQL database.

## Prerequisites

1.  **PostgreSQL**: Ensure PostgreSQL is installed and running.
    -   Default Connection String: `Host=localhost;Port=5432;Database=Mycafe;Username=postgres;Password=2234`
    -   You can change this in `MyCafe.Backend/appsettings.json`.
2.  **.NET 8 SDK**: Install from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0).
3.  **Node.js**: For running the frontend.

## 1. Database Setup

You have two options:

**Option A: Let EF Core create the database (Recommended)**
The application is configured to automatically create the database and tables on startup (`db.Database.EnsureCreated()` in `Program.cs`). Just run the backend.

**Option B: Manual SQL Script**
Run the provided SQL script `MyCafe.Backend/db_schema.sql` in your PostgreSQL tool (pgAdmin, DBeaver, psql).

## 2. Running the Backend

1.  Open a terminal in `MyCafe.Backend` directory.
2.  Run the application:
    ```powershell
    dotnet run
    ```
3.  The backend will start at `http://localhost:5238`.

## 3. Running the Frontend

1.  Open a terminal in the root `Mycafe` directory.
2.  Install dependencies:
    ```powershell
    npm install
    ```
3.  Start the development server:
    ```powershell
    npm run dev
    ```
4.  Open `http://localhost:5173` (or the port shown) in your browser.

## 4. API Endpoints

-   **Menu**:
    -   `GET /api/menu/categories`: List categories
    -   `GET /api/menu/items`: List menu items
    -   `POST /api/menu/upload`: Upload image (multipart/form-data)
-   **Tables**:
    -   `GET /api/table`: List tables
    -   `POST /api/table`: Create table
-   **Orders**:
    -   `POST /api/order`: Place/Append order
    -   `GET /api/order`: List all orders
-   **Payment**:
    -   `POST /api/payment/checkout`: Process payment
-   **Reports**:
    -   `GET /api/report/stats`: Revenue stats
    -   `GET /api/report/export`: Download CSV

## 5. Usage Flow

1.  **Admin -> Table Management**: Add some initial tables (e.g., "01", "02").
2.  **Admin -> Menu**: Add categories and products. Upload images.
3.  **Customer**: Open Customer View, select a table, place an order.
4.  **Admin -> POS**: See the active table status, view order detailed.
5.  **Payment**: In Admin POS or Order view, checkout with Cash or Bank Transfer. Table resets automatically.
