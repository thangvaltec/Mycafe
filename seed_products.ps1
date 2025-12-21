
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "Fetching Categories..."
$cats = Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Get
Write-Host "Found $($cats.Count) categories"

$items = @(
    @{ name = "Cà phê Đen"; price = 25000; catIndex = 0 },
    @{ name = "Cà phê Sữa"; price = 30000; catIndex = 0 },
    @{ name = "Bạc Xỉu"; price = 32000; catIndex = 0 },
    @{ name = "Trà Đào Cam Sả"; price = 45000; catIndex = 1 },
    @{ name = "Trà Vải"; price = 45000; catIndex = 1 },
    @{ name = "Sinh tố Bơ"; price = 50000; catIndex = 2 }
)

foreach ($item in $items) {
    if ($item.catIndex -lt $cats.Count) {
        try {
            $body = @{
                name        = $item.name
                price       = $item.price
                categoryId  = $cats[$item.catIndex].id
                imagePath   = "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=500"
                description = "Ngon"
                isActive    = $true
            } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/api/menu/items" -Method Post -Body $body -ContentType "application/json" | Out-Null
            Write-Host "Created $($item.name)"
        }
        catch { Write-Host "Error creating $($item.name)" }
    }
}
Write-Host "Done Products"
