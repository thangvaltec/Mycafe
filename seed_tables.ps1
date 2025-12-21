
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "Creating Tables..."
for ($i = 1; $i -le 10; $i++) {
    try {
        $body = @{ name = "Bàn $i"; tableNumber = "B$i" } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "Created Bàn $i"
    }
    catch {}
}
# Takeaway
try {
    $body = @{ name = "MANG VỀ" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$baseUrl/api/table" -Method Post -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Created MANG VỀ"
}
catch {}
Write-Host "Done Tables"
