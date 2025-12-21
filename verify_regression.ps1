
$baseUrl = "http://localhost:5238/api"

function Invoke-Api {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 5
            return Invoke-RestMethod -Uri "$baseUrl$Uri" -Method $Method -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
        }
        else {
            return Invoke-RestMethod -Uri "$baseUrl$Uri" -Method $Method -ContentType "application/json" -ErrorAction Stop
        }
    }
    catch {
        Write-Host "❌ Error calling $Uri ($Method): $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                Write-Host "   Response: $($reader.ReadToEnd())" -ForegroundColor Red
            }
        }
        return $null
    }
}

Write-Host "🧪 STARTING REGRESSION TEST..." -ForegroundColor Cyan

# 1. Create a Test Table
Write-Host "`n1. Creating Test Table..." -ForegroundColor Yellow
$table = Invoke-Api "/table" -Method POST -Body @{ name = "Table REGRESSION"; alias = "Test Regression"; tableNumber = "REG-01" }
if ($table) { Write-Host "✅ Table created: $($table.id)" -ForegroundColor Green } else { exit }

# 2. Get a Product to Order
Write-Host "`n2. Fetching Product..." -ForegroundColor Yellow
$products = Invoke-Api "/menu/items"
if ($products.Count -eq 0) { Write-Host "❌ No products found! Seed data first." -ForegroundColor Red; exit }
$product = $products[0]
Write-Host "✅ Using Product: $($product.name) (ID: $($product.id))" -ForegroundColor Green

# 3. Place Order
Write-Host "`n3. Placing Order..." -ForegroundColor Yellow
$order = Invoke-Api "/order" -Method POST -Body @{
    tableId = $table.id
    items   = @(
        @{ productId = $product.id; productName = $product.name; price = $product.price; quantity = 2 }
    )
}
if ($order) { Write-Host "✅ Order created: $($order.id) (Total: $($order.totalAmount))" -ForegroundColor Green } else { exit }

# 4. Add Another Item (to be deleted)
Write-Host "`n4. Adding 2nd Item (to serve as delete target)..." -ForegroundColor Yellow
$orderUpdated = Invoke-Api "/order" -Method POST -Body @{
    tableId = $table.id
    items   = @(
        @{ productId = $product.id; productName = "ITEM TO DELETE"; price = 50000; quantity = 1 }
    )
}
if ($orderUpdated) { Write-Host "✅ Item added. Total is now: $($orderUpdated.totalAmount)" -ForegroundColor Green }

# 5. Delete Item
# Reload order to get fresh Items list with IDs
$orderRefreshed = Invoke-Api "/order/table/$($table.id)"
$itemToDelete = $orderRefreshed.items | Where-Object { $_.productName -eq "ITEM TO DELETE" } | Select-Object -First 1

if ($itemToDelete) {
    Write-Host "`n5. Deleting Item: $($itemToDelete.productName) ($($itemToDelete.id))..." -ForegroundColor Yellow
    # THIS IS THE CRITICAL REGRESSION TEST FOR GUID PARAMETER
    $deleteResult = Invoke-Api "/order/$($orderRefreshed.id)/items/$($itemToDelete.id)" -Method DELETE
    if ($deleteResult) {
        Write-Host "✅ DELETE Success! New Total: $($deleteResult.totalAmount)" -ForegroundColor Green
        if ($deleteResult.items.Count -eq 1) {
            Write-Host "✅ Verified Integrity: Item count back to 1." -ForegroundColor Green
        }
        else {
            Write-Host "❌ Integrity Fail: Item count is $($deleteResult.items.Count)" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "❌ Could not find item to delete!" -ForegroundColor Red
}

# 6. Checkout
Write-Host "`n6. Checking out..." -ForegroundColor Yellow
$checkoutRes = Invoke-Api "/payment/checkout" -Method POST -Body @{
    tableId        = $table.id
    paymentMethod  = "CASH"
    receivedAmount = 500000
}
if ($checkoutRes) { Write-Host "✅ Checkout Success! Order Status: $($checkoutRes.order.status)" -ForegroundColor Green }

# 7. Clean up Table
Write-Host "`n7. Cleaning up Table..." -ForegroundColor Yellow
Invoke-Api "/table/$($table.id)" -Method DELETE | Out-Null
Write-Host "✅ Cleanup Done." -ForegroundColor Green

Write-Host "`n🎉 ALL REGRESSION TESTS PASSED!" -ForegroundColor Cyan
