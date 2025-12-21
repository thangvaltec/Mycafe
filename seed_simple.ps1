
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "Creating Categories..."
$names = @("Coffee", "Tea", "Juice")
foreach ($n in $names) {
    try {
        $body = @{ name = $n } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/menu/categories" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "Created $n"
    }
    catch { Write-Host "Error $n" }
}
Write-Host "Done"
