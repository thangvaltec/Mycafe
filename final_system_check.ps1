
# FINAL SYSTEM HEALTH CHECK SCRIPT
# Checks API availability, Table IDs, and Core Flow
$ErrorActionPreference = "Stop"
$apiUrl = "http://localhost:5238/api"

function Test-Step($name, $block) {
    Write-Host "[$name]... " -NoNewline
    try {
        & $block
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "--- STARTING FINAL SYSTEM CHECK ---" -ForegroundColor Cyan

# 1. CHECK TABLE IDs
Test-Step "Check Table IDs" {
    $tables = Invoke-RestMethod -Uri "$apiUrl/table" -Method Get
    
    # Check Table 1
    $t1 = $tables | Where-Object { $_.tableNumber -eq "01" }
    if ($t1.id -ne 1) { throw "Table 01 has ID $($t1.id), expected 1" }
    
    # Check Mang Ve
    $tmv = $tables | Where-Object { $_.tableNumber -eq "MV" }
    if ($tmv.id -ne 11) { throw "Table Mang Ve has ID $($tmv.id), expected 11" }
}

# 2. LOGIN
Test-Step "Login Admin" {
    $body = @{ Username = "admin"; Password = "admin123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $res.token) { throw "No token received" }
}

# 3. CREATE MENU ITEM
Test-Step "Create Menu Item" {
    $cats = Invoke-RestMethod -Uri "$apiUrl/menu/categories" -Method Get
    if ($cats.Count -eq 0) { throw "No categories found (DB Seed failed?)" }
    
    $product = @{
        name       = "Test Cafe Cuoi Cung"
        price      = 10000
        categoryId = $cats[0].id
        isActive   = $true
    } | ConvertTo-Json
    $p = Invoke-RestMethod -Uri "$apiUrl/menu/items" -Method Post -Body $product -ContentType "application/json"
}

# 4. PLACE ORDER
Test-Step "Place Order (Table 1)" {
    # Get products again to find the one we just made
    $products = Invoke-RestMethod -Uri "$apiUrl/menu/items" -Method Get
    $p = $products | Select-Object -First 1
    
    $orderData = @{
        tableId = 1 # ID 1 is Table 1
        items   = @(
            @{ productId = $p.id; quantity = 1; productName = "checking"; price = 0 }
        )
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$apiUrl/order" -Method Post -Body $orderData -ContentType "application/json"
}

# 5. VERIFY DELETE BLOCK
Test-Step "Verify Delete Block" {
    # Table 1 now has an order, should NOT be deletable
    try {
        Invoke-RestMethod -Uri "$apiUrl/table/1" -Method Delete
        throw "API allowed deleting occupied table!"
    }
    catch {
        if ($_.Exception.Message -match "400") {
            # Expected
        }
        else {
            throw "Unexpected error: $($_.Exception.Message)"
        }
    }
}

Write-Host "--- ALL CHECKS PASSED ---" -ForegroundColor Green
Write-Host "System is ready for manual UI testing."
