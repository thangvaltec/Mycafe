
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
            # Capture Response Stream
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                Write-Host "   Response: $($reader.ReadToEnd())" -ForegroundColor Red
            }
        }
        return $null
    }
}

Write-Host "🎱 STARTING BILLIARD TEST..." -ForegroundColor Cyan

# 1. Start Session
# Requires a table ID. Since we didn't seed BI-01 tables, use the REG-01 table from regression test or create one.
# Let's create a Billiard Table first
$table = Invoke-Api "/table" -Method POST -Body @{ name = "Ban Bida 01"; tableNumber = "BI-01"; alias = "Bi-a" }
if (!$table) { Write-Host "Skipping create table (might exist)"; $table = Invoke-Api "/table" | Where-Object { $_.tableNumber -eq "BI-01" } | Select-Object -First 1 }

if (!$table) { Write-Host "❌ Could not find/create table BI-01"; exit }

Write-Host "`n1. Starting Session on Table $($table.tableNumber) ($($table.id))..." -ForegroundColor Yellow
$startBody = @{
    tableId      = $table.id
    guestName    = "Test Player"
    numPeople    = 4
    pricePerHour = 50000
}
$session = Invoke-Api "/billiard/start" -Method POST -Body $startBody

if ($session) {
    Write-Host "✅ Session Started: $($session.id)" -ForegroundColor Green
}
else {
    Write-Host "❌ Start Failed" -ForegroundColor Red
    # Exit if failed, maybe table busy
}

# 2. Stop Session
if ($session) {
    Start-Sleep -Seconds 2
    Write-Host "`n2. Stopping Session..." -ForegroundColor Yellow
    $stopRes = Invoke-Api "/billiard/$($session.id)/stop" -Method PUT
    if ($stopRes) {
        Write-Host "✅ Session Stopped. EndTime: $($stopRes.endTime)" -ForegroundColor Green
    }
}

# 3. Pay Session (Logic test)
if ($session) {
    Write-Host "`n3. Paying Session..." -ForegroundColor Yellow
    $payRes = Invoke-Api "/billiard/$($session.id)/pay" -Method PUT -Body @{ totalAmount = 50000 }
    if ($payRes -and $payRes.status -eq "PAID") {
        Write-Host "✅ Session PAID!" -ForegroundColor Green
    }
}

Write-Host "`n🎱 BILLIARD TEST COMPLETE" -ForegroundColor Cyan
