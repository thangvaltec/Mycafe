
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "--- SEEDING FULL DATA ---" -ForegroundColor Cyan

# 1. CATEGORIES
Write-Host "1. Products..." -ForegroundColor Green
# Fetch existing categories or create
$cats = Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Get
if ($cats.Count -eq 0) {
    $names = @("Cà phê", "Trà trái cây", "Sinh tố", "Đá xay", "Ăn vặt")
    foreach ($n in $names) {
        $body = @{ name = $n } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Post -Body $body -ContentType "application/json" | Out-Null
    }
    $cats = Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Get
}

# Create Products
$products = @()
$items = @(
    @{ name = "Cà phê Đen"; price = 25000; catIndex = 0; img = "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=500" },
    @{ name = "Cà phê Sữa"; price = 30000; catIndex = 0; img = "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500" },
    @{ name = "Bạc Xỉu"; price = 32000; catIndex = 0; img = "https://images.unsplash.com/photo-1584286595398-a59f21d313af?w=500" },
    @{ name = "Trà Đào Cam Sả"; price = 45000; catIndex = 1; img = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500" },
    @{ name = "Trà Vải"; price = 45000; catIndex = 1; img = "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500" },
    @{ name = "Sinh tố Bơ"; price = 50000; catIndex = 2; img = "https://images.unsplash.com/photo-1574783756547-258b3c4fb716?w=500" },
    @{ name = "Cookie Đá xay"; price = 55000; catIndex = 3; img = "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500" },
    @{ name = "Hướng Dương"; price = 15000; catIndex = 4; img = "https://images.unsplash.com/photo-1621508654686-22a81878d672?w=500" }
)

foreach ($item in $items) {
    try {
        if ($item.catIndex -lt $cats.Count) {
            # Check if product exists to avoid dupes (simple check not implemented, just create)
            $body = @{
                name        = $item.name
                price       = $item.price
                categoryId  = $cats[$item.catIndex].id
                imagePath   = $item.img
                description = "Thơm ngon"
                isActive    = $true
            } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/api/menu/items" -Method Post -Body $body -ContentType "application/json" | Out-Null
            Write-Host "   + $($item.name)"
        }
    }
    catch {}
}

# 2. TABLES
Write-Host "2. Tables..." -ForegroundColor Green
for ($i = 1; $i -le 10; $i++) {
    try {
        $body = @{ name = "Bàn $i" } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
    }
    catch {}
}
# Takeaway
try {
    $body = @{ name = "MANG VỀ" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
}
catch {}

# 3. ORDERS & EXPENSES
Write-Host "3. Orders & Expenses..." -ForegroundColor Green

# Refresh data
$tables = Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Get
$allProducts = Invoke-RestMethod -Uri "$baseUrl/api/menu/items" -Method Get

if ($tables.Count -gt 0 -and $allProducts.Count -ge 2) {
    for ($k = 0; $k -lt 5; $k++) {
        $tbl = $tables[$k % $tables.Count]
        $p1 = $allProducts[0]
        $p2 = $allProducts[1]
        
        # Place Order
        $itemsList = @(
            @{ productId = $p1.id; quantity = 2; productName = $p1.name; price = $p1.price },
            @{ productId = $p2.id; quantity = 1; productName = $p2.name; price = $p2.price }
        )
        $orderBody = @{ tableId = $tbl.id; items = $itemsList } | ConvertTo-Json -Depth 5 -Compress
        
        try {
            $order = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method Post -Body $orderBody -ContentType "application/json"
            
            # Checkout
            if ($order) {
                # Calculate total manually or trust backend logic (but checkout needs amount)
                $total = ($p1.price * 2) + $p2.price 
                $payBody = @{ tableId = $tbl.id; paymentMethod = "cash"; receivedAmount = $total } | ConvertTo-Json -Compress
                Invoke-RestMethod -Uri "$baseUrl/api/payment/checkout" -Method Post -Body $payBody -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
                Write-Host "   Paid Order Table $($tbl.name)"
            }
        }
        catch { Write-Host "   Skip order error" }
        Start-Sleep -Milliseconds 100
    }
}

# Expenses
$exps = @(
    @{ description = "Nhập hàng"; amount = 500000 },
    @{ description = "Điện nước"; amount = 200000 },
    @{ description = "Tạp phí"; amount = 150000 }
)
foreach ($e in $exps) {
    try {
        $body = $e | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/report/expenses" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "   Expense: $($e.description)"
    }
    catch {}
}

Write-Host "DONE SEEDING" -ForegroundColor Cyan
