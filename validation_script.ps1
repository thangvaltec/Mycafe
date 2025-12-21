$baseUrl = "http://localhost:5238/api/report/expenses"
$ErrorActionPreference = "Stop"

Write-Host "Waiting for server..."
Start-Sleep -Seconds 5

Write-Host "1. Adding Expense..."
$body = @{
    description = "Test Expense Auto";
    amount      = 10000;
    date        = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json"
    $id = $res.id
    Write-Host "   Added ID: $id"
}
catch {
    Write-Error "Failed to add expense. Is server unavailable? $_"
    exit 1
}

Write-Host "2. Updating Expense ($id)..."
$updateBody = @{
    id          = $id;
    description = "Updated Expense Auto";
    amount      = 50000;
    date        = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $resUpdate = Invoke-RestMethod -Uri "$baseUrl/$id" -Method Put -Body $updateBody -ContentType "application/json"
    if ($resUpdate.description -eq "Updated Expense Auto") {
        Write-Host "   Update Success."
    }
    else {
        Write-Error "   Update Failed: Content mismatch."
    }
}
catch {
    Write-Error "Failed to update expense: $_"
    exit 1
}

Write-Host "3. Deleting Expense ($id)..."
try {
    Invoke-RestMethod -Uri "$baseUrl/$id" -Method Delete
    Write-Host "   Delete Success."
}
catch {
    Write-Error "Failed to delete expense: $_"
    exit 1
}

Write-Host "ALL API TESTS PASSED"
