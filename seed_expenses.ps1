
$baseUrl = "http://localhost:5238"
$ErrorActionPreference = "Stop"

Write-Host "Seeding Expenses..."
$exps = @(
    @{ description = "Nhập hàng hóa"; amount = 500000 },
    @{ description = "Tiền điện"; amount = 200000 },
    @{ description = "Tạp phí"; amount = 150000 }
)
foreach ($e in $exps) {
    try {
        $body = $e | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$baseUrl/api/report/expenses" -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "Created Expense $($e.description)"
    }
    catch { Write-Host "Error expense" }
}
Write-Host "Done Expenses"
