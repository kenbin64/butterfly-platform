param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deepseek","qwen","gemma","nomic")]
    [string]$Coordinate
)

# Model manifold (dimension → port)
$manifold = @{
    "deepseek" = 5100
    "qwen"     = 5200
    "gemma"    = 5300
    "nomic"    = 5400
}

# Engine directories
$enginePaths = @{
    "deepseek" = "C:\AI\tabby-deepseek"
    "qwen"     = "C:\AI\tabby-qwen"
    "gemma"    = "C:\AI\tabby-gema"
    "nomic"    = "C:\AI\nomic-embed-text"
}

# Collapse operator: kill all ports in the manifold
foreach ($p in $manifold.Values) {
    $enginePid = (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue).OwningProcess
    if ($enginePid) {
        Stop-Process -Id $enginePid -Force
        Start-Sleep -Milliseconds 800
    }
}

# Verify collapse
foreach ($p in $manifold.Values) {
    if (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue) {
        Write-Host "ERROR: Port $p still in use after collapse."
        exit 1
    }
}

# Expansion operator
$port = $manifold[$Coordinate]
$path = $enginePaths[$Coordinate]

Write-Host "Launching $Coordinate from $path on port $port..."

Start-Process -FilePath "$path\tabby.exe" `
    -WorkingDirectory $path `
    -ArgumentList "serve --port $port"

Start-Sleep -Seconds 2

# Verify expansion
if (-not (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: $Coordinate failed to bind to port $port."
    exit 1
}

Write-Host "$Coordinate is now active on port $port."