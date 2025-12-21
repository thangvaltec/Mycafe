
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "Seeding Orders..."
$tables = Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Get
$products = Invoke-RestMethod -Uri "$baseUrl/api/menu/items" -Method Get

if ($tables.Count -gt 0 -and $products.Count -ge 2) {
    for ($k = 0; $k -lt 5; $k++) {
        $tbl = $tables[$k % $tables.Count]
        $p1 = $products[0]
        
        # Place Order
        $items = @( @{ productId = $p1.id; quantity = 2; productName = $p1.name; price = $p1.price } )
        $body = @{ tableId = $tbl.id; items = $items } | ConvertTo-Json -Depth 5 -Compress
        
        try {
            $order = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method Post -Body $body -ContentType "application/json"
            
            # Pay
            if ($order) {
                # Add delay to avoid timestamp collision for sorting
                Start-Sleep -Milliseconds 100
                $payBody = @{ tableId = $tbl.id; paymentMethod = "cash"; receivedAmount = ($p1.price * 2) } | ConvertTo-Json -Compress
                Invoke-RestMethod -Uri "$baseUrl/api/payment/checkout" -Method Post -Body $payBody -ContentType "application/json" | Out-Null
                Write-Host "Paid Order Table $($tbl.name)"
            }
        }
        catch { Write-Host "Error order $_" }
    }
}
Write-Host "Done Orders"
