
# Test Script: Verify Order Item Deletion API
$baseUrl = "http://localhost:5238/api"

function Test-DeleteItem {
    Write-Host "--- Testing Order Item Deletion ---" -ForegroundColor Cyan

    # 1. Get a Table (e.g. Table 1)
    $tableId = 1
    
    # 2. Add Item to Order (Create/Update Order)
    $items = @(
        @{ ProductId = $null; ProductName = "Test Item To Delete"; Price = 50000; Quantity = 1 },
        @{ ProductId = $null; ProductName = "Item To Keep"; Price = 20000; Quantity = 1 }
    )
    
    $body = @{
        TableId = $tableId
        Items   = $items
    } | ConvertTo-Json -Depth 4

    try {
        Write-Host "1. Placing Order..."
        $order = Invoke-RestMethod -Uri "$baseUrl/order" -Method Post -Body $body -ContentType "application/json"
        Write-Host "   Order Created: $($order.id) with count $($order.items.Count)" -ForegroundColor Green

        if ($order.items.Count -lt 2) {
            Write-Error "Failed to add items properly."
            return
        }

        # Find Item to Delete
        $itemToDelete = $order.items | Where-Object { $_.productName -eq "Test Item To Delete" } | Select-Object -First 1
        
        if (-not $itemToDelete) {
            Write-Error "Could not find target item."
            return
        }
        
        Write-Host "   Target Item ID: $($itemToDelete.id)"

        # 3. Delete the Item
        Write-Host "2. Deleting Item..."
        $deleteUri = "$baseUrl/order/$($order.id)/items/$($itemToDelete.id)"
        $updatedOrder = Invoke-RestMethod -Uri $deleteUri -Method Delete

        # 4. Verify
        Write-Host "3. Verifying..."
        $deletedCheck = $updatedOrder.items | Where-Object { $_.id -eq $itemToDelete.id }
        
        if (-not $deletedCheck) {
            Write-Host "   SUCCESS: Item was removed." -ForegroundColor Green
            Write-Host "   New Total: $($updatedOrder.totalAmount)"
        }
        else {
            Write-Error "   FAILURE: Item still exists."
        }

    }
    catch {
        Write-Error "API Request Failed: $_"
        Write-Host $_.Exception.Response.StatusCode
    }
}

Test-DeleteItem
