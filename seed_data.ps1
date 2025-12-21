
# Seed Data Script - Clean Version
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "--- STARTED SEEDING DATA ---" -ForegroundColor Cyan

# 1. CATEGORIES
Write-Host "1. Creating Categories..." -ForegroundColor Green
$cats = @()
$catNames = @("Cà phê", "Trà trái cây", "Sinh tố", "Đá xay", "Ăn vặt")

foreach ($name in $catNames) {
    try {
        $body = @{ name = $name } | ConvertTo-Json -Compress
        $res = Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Post -Body $body -ContentType "application/json"
        $cats += $res
        Write-Host "   Created: $name"
    }
    catch {
        Write-Host "   Error creating $name : $_" -ForegroundColor Yellow
    }
}

# 2. PRODUCTS
Write-Host "2. Creating Products..." -ForegroundColor Green
$products = @()
if ($cats.Count -gt 0) {
    $items = @(
        @{ name = "Cà phê Đen"; price = 25000; cat = $cats[0].id; img = "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=500" },
        @{ name = "Cà phê Sữa"; price = 30000; cat = $cats[0].id; img = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500" },
        @{ name = "Bạc Xỉu"; price = 32000; cat = $cats[0].id; img = "https://images.unsplash.com/photo-1584286595398-a59f21d313af?w=500" },
        @{ name = "Trà Đào Cam Sả"; price = 45000; cat = $cats[1].id; img = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500" },
        @{ name = "Trà Vải"; price = 45000; cat = $cats[1].id; img = "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500" },
        @{ name = "Sinh tố Bơ"; price = 50000; cat = $cats[2].id; img = "https://images.unsplash.com/photo-1574783756547-258b3c4fb716?w=500" },
        @{ name = "Cookie Đá xay"; price = 55000; cat = $cats[3].id; img = "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500" },
        @{ name = "Hướng Dương"; price = 15000; cat = $cats[4].id; img = "https://images.unsplash.com/photo-1621508654686-22a81878d672?w=500" }
    )

    foreach ($item in $items) {
        try {
            $body = @{
                name        = $item.name
                price       = $item.price
                categoryId  = $item.cat
                imagePath   = $item.img
                description = "Ngon tuyệt vời"
                isActive    = $true
            } | ConvertTo-Json -Compress
            $p = Invoke-RestMethod -Uri "$baseUrl/api/menu/items" -Method Post -Body $body -ContentType "application/json"
            $products += $p
            Write-Host "   Created: $($item.name)"
        }
        catch {
            Write-Host "   Error creating $($item.name) : $_" -ForegroundColor Yellow
        }
    }
}

# 3. TABLES
Write-Host "3. Creating Tables..." -ForegroundColor Green
for ($i = 1; $i -le 10; $i++) {
    try {
        $body = @{ name = "Bàn $i" } | ConvertTo-Json -Compress
        $t = Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Host "   Created: Bàn $i"
    }
    catch {}
}
# Takeaway
try {
    $body = @{ name = "MANG VỀ" } | ConvertTo-Json -Compress
    $t = Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
}
catch {}


# 4. ORDERS & EXPENSES
Write-Host "4. Orders & Expenses..." -ForegroundColor Green
try {
    # Get Tables
    $tables = Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Get
    
    if ($tables.Count -gt 0 -and $products.Count -gt 0) {
        # Create 5 orders
        1..5 | ForEach-Object {
            $tbl = $tables[$_ % $tables.Count]
            
            # 1. Place Order
            $orderItems = @(
                @{ productId = $products[0].id; quantity = 2; productName = $products[0].name; price = $products[0].price },
                @{ productId = $products[3].id; quantity = 1; productName = $products[3].name; price = $products[3].price }
            )
            $orderBody = @{ tableId = $tbl.id; items = $orderItems } | ConvertTo-Json -Depth 5 -Compress
            
            try {
                $order = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method Post -Body $orderBody -ContentType "application/json"
                
                # 2. Checkout
                # Calculate Total
                $total = ($products[0].price * 2) + $products[3].price
                $payBody = @{ tableId = $tbl.id; paymentMethod = "cash"; receivedAmount = $total } | ConvertTo-Json -Compress
                
                Invoke-RestMethod -Uri "$baseUrl/api/payment/checkout" -Method Post -Body $payBody -ContentType "application/json" | Out-Null
                Write-Host "   Paid Order for $($tbl.name): $total"
            }
            catch {
                Write-Host "   Error processing order: $_" -ForegroundColor Yellow
            }
            Start-Sleep -Milliseconds 100
        }
    }
}
catch {
    Write-Host "   Error fetching data: $_" -ForegroundColor Red
}

# 5. EXPENSES
Write-Host "5. Creating Expenses..." -ForegroundColor Green
$exps = @(
    @{ description = "Nhập cà phê"; amount = 500000 },
    @{ description = "Tiền điện"; amount = 200000 },
    @{ description = "Ly nhựa"; amount = 150000 }
)
foreach ($e in $exps) {
    try {
        $body = $e | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/report/expenses" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "   Expense: $($e.description)"
    }
    catch {
        Write-Host "   Error expense: $_" -ForegroundColor Yellow
    }
}

Write-Host "DONE" -ForegroundColor Cyan
