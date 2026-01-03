
$baseUrl = "http://localhost:5238/api"

function Send-PostRequest($endpoint, $body) {
    Try {
        $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method Post -Body ($body | ConvertTo-Json -Depth 5) -ContentType "application/json" -ErrorAction Stop
        Write-Host "Success: $endpoint"
    }
    Catch {
        Write-Host "Error: $_"
    }
}

Write-Host "Seeding Data..."

# 1. Create Tables
Write-Host "Creating Tables..."

# Billiard Tables (4)
for ($i = 1; $i -le 4; $i++) {
    $num = "BI-0$i"
    # Using ASCII names to avoid encoding issues: Ban Bida -> Billiard Table
    $name = "Ban Bida $i"
    Send-PostRequest "/table" @{ name = $name; type = "billiard"; status = "available"; pricePerHour = 50000; tableNumber = $num; alias = "Bi-a" }
}

# Cafe Tables (1-10)
for ($i = 1; $i -le 10; $i++) {
    $num = "{0:D2}" -f $i
    $name = "Ban $i"
    Send-PostRequest "/table" @{ name = $name; type = "normal"; status = "available"; tableNumber = $num; alias = "Cafe" }
}

# Takeaway Table
Send-PostRequest "/table" @{ name = "Mang ve"; type = "service"; status = "available"; tableNumber = "MV"; alias = "Takeaway" }

# 2. Create Categories
Write-Host "Creating Categories..."
$catDrink = Send-PostRequest "/menu/categories" @{ name = "Do uong"; description = "Drinks" }
$catFood = Send-PostRequest "/menu/categories" @{ name = "Do an"; description = "Foods" }
$catService = Send-PostRequest "/menu/categories" @{ name = "Dich vu"; description = "Services" }

# 3. Create Products
Write-Host "Creating Products..."
# Use dummy IDs if variables are null (though Invoke-RestMethod should return object)
if ($catDrink) {
    Send-PostRequest "/menu/items" @{ name = "Ca phe den"; price = 25000; categoryId = $catDrink.id; isActive = $true; description = "Black Coffee" }
    Send-PostRequest "/menu/items" @{ name = "Ca phe sua"; price = 30000; categoryId = $catDrink.id; isActive = $true; description = "Milk Coffee" }
    Send-PostRequest "/menu/items" @{ name = "Sting"; price = 15000; categoryId = $catDrink.id; isActive = $true; description = "Energy Drink" }
}
if ($catFood) {
    Send-PostRequest "/menu/items" @{ name = "Mi tom trung"; price = 35000; categoryId = $catFood.id; isActive = $true; description = "Noodles" }
}
if ($catService) {
    Send-PostRequest "/menu/items" @{ name = "Phi Bida"; price = 50000; categoryId = $catService.id; isActive = $true; description = "Billiard Fee" }
}

Write-Host "Seeding Complete!"
