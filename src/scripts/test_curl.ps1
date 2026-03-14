$env:GEMINI_API_KEY = Get-Content .env.local | Select-String "GEMINI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1].Trim() }

if (-not $env:GEMINI_API_KEY) {
    Write-Host "API Key not found"
    exit 1
}

$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$($env:GEMINI_API_KEY)"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    $response.models | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 models.json
    Write-Host "✅ Models saved to models.json"
} catch {
    Write-Host "❌ Error listing models"
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
