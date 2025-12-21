
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
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

$tables = @("BI-01", "BI-02", "BI-03", "BI-04")

Write-Host "🎱 Seeding Billiard Tables..." -ForegroundColor Cyan

foreach ($t in $tables) {
    # Check if exists
    $existing = Invoke-Api "/table" | Where-Object { $_.tableNumber -eq $t }
    
    if ($existing) {
        Write-Host "✅ Table $t already exists." -ForegroundColor Gray
    }
    else {
        Write-Host "➕ Creating Table $t..." -ForegroundColor Yellow
        $res = Invoke-Api "/table" -Method POST -Body @{
            name        = "Bàn Bida $t"
            tableNumber = $t
            alias       = "Bi-a"
        }
        if ($res) {
            Write-Host "✅ Created $t" -ForegroundColor Green
        }
    }
}

Write-Host "🎉 Seed Complete!" -ForegroundColor Cyan
