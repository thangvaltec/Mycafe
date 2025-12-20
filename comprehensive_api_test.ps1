# COMPREHENSIVE API TEST SUITE
# Verifies all backend flows for final deployment readiness
$ErrorActionPreference = "Stop"
$p = "http://localhost:5238/api"
$token = ""

function Assert-Ok($step, $block) {
    Write-Host "[$step]... " -NoNewline
    try {
        $res = & $block
        Write-Host "PASS" -ForegroundColor Green
        return $res
    }
    catch {
        Write-Host "FAIL" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Yellow
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "  Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
        }
        exit 1
    }
}

Write-Host "`n=== STARTING FINAL API AUDIT ===`n" -ForegroundColor Cyan

# 1. AUTHENTICATION
$token = Assert-Ok "Auth: Login Admin" {
    $body = @{ Username = "admin"; Password = "admin123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$p/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $res.token) { throw "No token returned" }
    return $res.token
}
$headers = @{ Authorization = "Bearer $token" }

# 2. TABLE MANAGEMENT
Assert-Ok "Table: Verify Seeding (1-10 + MV)" {
    $tables = Invoke-RestMethod -Uri "$p/table" -Method Get
    $t1 = $tables | Where-Object { $_.id -eq 1 }; if ($t1.tableNumber -ne "01") { throw "Table ID 1 is not 01" }
    $t10 = $tables | Where-Object { $_.id -eq 10 }; if ($t10.tableNumber -ne "10") { throw "Table ID 10 is not 10" }
    $tmv = $tables | Where-Object { $_.id -eq 11 }; if ($tmv.alias -ne "Takeaway") { throw "Table ID 11 is not Takeaway" }
}

Assert-Ok "Table: Create New Table (Check Sort Order)" {
    $rnd = Get-Random -Minimum 100 -Maximum 999
    $new = Invoke-RestMethod -Uri "$p/table" -Method Post -Body (@{ Name = "Bàn Test $rnd"; TableNumber = "$rnd" } | ConvertTo-Json) -ContentType "application/json"
    if ($new.id -le 11) { throw "New table ID should be > 11" }
    
    # Verify it appears at the END
    $tables = Invoke-RestMethod -Uri "$p/table" -Method Get
    $last = $tables[$tables.Count - 1]
    if ($last.id -ne $new.id) { throw "New table is not last in list (Sorting issue)" }
    return $new
}

# 3. MENU MANAGEMENT
$catId = Assert-Ok "Menu: Get Categories" {
    $cats = Invoke-RestMethod -Uri "$p/menu/categories" -Method Get
    if ($cats.Count -eq 0) { throw "No categories found" }
    return $cats[0].id
}

$prodId = Assert-Ok "Menu: Create Item" {
    $item = @{
        name       = "Test Drink Final"
        price      = 50000
        categoryId = $catId
        isActive   = $true
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$p/menu/items" -Method Post -Body $item -ContentType "application/json"
    return $res.id
}

# 4. ORDERING FLOW
Assert-Ok "Order: Place Order on Table 1" {
    # Ensure Table 1 is empty first
    # (In a real scenario we'd check status, but let's assume valid state or ignore 400 if already occupied for this specific test flow, but strict test expects clear state)
    
    $order = @{
        tableId = 1
        items   = @( @{ productId = $prodId; quantity = 2; productName = "Test Drink Final"; price = 50000 } )
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$p/order" -Method Post -Body $order -ContentType "application/json"
    return $res
}

Assert-Ok "Table: Verify Occupied Status" {
    $tables = Invoke-RestMethod -Uri "$p/table" -Method Get
    $t1 = $tables | Where-Object { $_.id -eq 1 }
    if (-not $t1.isOccupied) { throw "Table 1 should be Occupied" }
}

# 5. DELETE PROTECTION (Backend)
Assert-Ok "Delete: Block Occupied Table" {
    try {
        Invoke-RestMethod -Uri "$p/table/1" -Method Delete
        throw "Should have failed"
    }
    catch {
        if ($_.Exception.Message -match "400") { return $true }
        throw $_
    }
}

# 6. PAYMENT
Assert-Ok "Payment: Checkout Table 1" {
    $res = Invoke-RestMethod -Uri "$p/payment/checkout" -Method Post -Body (@{
            tableId        = 1
            paymentMethod  = "cash"
            receivedAmount = 100000
        } | ConvertTo-Json) -ContentType "application/json"
}

Assert-Ok "Table: Verify Empty After Payment" {
    $tables = Invoke-RestMethod -Uri "$p/table" -Method Get
    $t1 = $tables | Where-Object { $_.id -eq 1 }
    if ($t1.isOccupied) { throw "Table 1 should be Empty after payment" }
}

# 7. REPORTS
Assert-Ok "Report: Get Daily Report" {
    Assert-Ok "Report: Get Daily Report" {
        $res = Invoke-RestMethod -Uri "$p/report/stats" -Method Get
        if ($res.revenue -lt 100000) { throw "Revenue not updated (Revenue: $($res.revenue))" }
    }
}

Write-Host "`n=== SYSTEM AUDIT COMPLETE: READY FOR DEPLOY ===`n" -ForegroundColor Green
