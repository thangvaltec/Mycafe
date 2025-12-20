
# Script verifies that deleting an occupied table is BLOCKED by the API
$apiUrl = "http://localhost:5238/api/table"

Write-Host "--- VERIFY DELETE BLOCK LOGIC ---" -ForegroundColor Cyan

try {
    # 1. Create an OCCUPIED table
    Write-Host "1. Creating Occupied Table..." -NoNewline
    $body = @{ tableNumber = "TEST_BLOCK"; name = "Ban Block Test"; status = "Occupied"; isOccupied = $true } | ConvertTo-Json
    $table = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
    Write-Host " OK (ID: $($table.id))" -ForegroundColor Green

    # 2. Try to DELETE it (Should Fail)
    Write-Host "2. Attempting to DELETE Occupied Table..."
    try {
        Invoke-RestMethod -Uri "$apiUrl/$($table.id)" -Method Delete
        Write-Host "❌ FATAL: API allowed deleting an occupied table!" -ForegroundColor Red
        exit 1
    }
    catch {
        # Check if error is 400 Bad Request
        if ($_.Exception.Message -match "400") {
            Write-Host "✅ PASS: API blocked deletion (400 Bad Request)." -ForegroundColor Green
            # Optional: Print the server message to ensure it's in Vietnamese
            $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
            Write-Host "   Server Message: $($reader.ReadToEnd())" -ForegroundColor DarkGray
        }
        else {
            Write-Host "⚠️ WARNING: Failed but with unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    # 3. Cleanup (Manually reset to empty then delete, to keep DB clean)
    # Since we don't have a direct 'Force Delete', we use the Reset endpoint if available or just leave it since DB is cleanable.
    # We will try to Reset it first using the unofficial cleanup logic if we implemented Reset endpoint
    try {
        Invoke-RestMethod -Uri "$apiUrl/$($table.id)/reset" -Method Post # Assuming ResetTable endpoint exists
        Invoke-RestMethod -Uri "$apiUrl/$($table.id)" -Method Delete
        Write-Host "3. Cleanup: Table reset and deleted." -ForegroundColor Gray
    }
    catch {
        Write-Host "   (Cleanup failed, table $($table.id) remains)" -ForegroundColor Gray
    }

}
catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
