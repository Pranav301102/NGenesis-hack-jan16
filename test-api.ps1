# Meta-Genesis API Testing Script (PowerShell)
# Make sure the server is running first: npm run dev

Write-Host "🧪 Testing Meta-Genesis API" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000"

# Test 1: Ping endpoint
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
Write-Host "→ GET $BaseUrl/ping"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/ping" -Method Get
    $response | ConvertTo-Json
    Write-Host ""
} catch {
    Write-Host "✗ Ping failed: $_" -ForegroundColor Red
}

# Test 2: Create an agent
Write-Host "Test 2: Create Agent (Amazon Price Tracker)" -ForegroundColor Yellow
Write-Host "→ POST $BaseUrl/genesis"

$body = @{
    user_intent = "Track product prices on Amazon"
    target_url = "https://www.amazon.com/dp/B08N5WRWNW"
    personality = "professional"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/genesis" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json
    $agentId = $response.agent_id
    Write-Host ""

    if ($agentId) {
        Write-Host "✓ Agent created: $agentId" -ForegroundColor Green
        Write-Host ""

        # Test 3: Check status
        Write-Host "Test 3: Check Agent Status" -ForegroundColor Yellow
        Write-Host "→ GET $BaseUrl/status/$agentId"

        # Poll status for 30 seconds
        for ($i = 1; $i -le 15; $i++) {
            Write-Host "Poll #$i..."
            $statusResponse = Invoke-RestMethod -Uri "$BaseUrl/status/$agentId" -Method Get
            $statusResponse | ConvertTo-Json

            $status = $statusResponse.status

            if ($status -eq "completed" -or $status -eq "failed") {
                break
            }

            Start-Sleep -Seconds 2
        }

        Write-Host ""

        # Test 4: Get timeline
        Write-Host "Test 4: Get Timeline" -ForegroundColor Yellow
        Write-Host "→ GET $BaseUrl/timeline/$agentId"
        $timelineResponse = Invoke-RestMethod -Uri "$BaseUrl/timeline/$agentId" -Method Get
        $timelineResponse | ConvertTo-Json
        Write-Host ""
    }

} catch {
    Write-Host "✗ Failed to create agent: $_" -ForegroundColor Red
}

# Test 5: Get all statuses
Write-Host "Test 5: Get All Agents" -ForegroundColor Yellow
Write-Host "→ GET $BaseUrl/status"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/status" -Method Get
    $response | ConvertTo-Json
    Write-Host ""
} catch {
    Write-Host "✗ Failed to get statuses: $_" -ForegroundColor Red
}

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✓ All tests completed" -ForegroundColor Green
