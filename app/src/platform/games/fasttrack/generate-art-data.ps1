# Generate art-data.js with base64-encoded PNG images
# This avoids file:// CORS/taint issues in Chrome

$artDir = Join-Path $PSScriptRoot 'assets\images\art'
$outFile = Join-Path $PSScriptRoot 'art-data.js'

$files = Get-ChildItem (Join-Path $artDir '*.png') | Sort-Object Name

$count = $files.Count
Write-Host "Generating art-data.js from $count PNG files..."

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('// Auto-generated - do not edit manually')
[void]$sb.AppendLine('// Base64-encoded art images for file:// protocol compatibility')
[void]$sb.AppendLine('const ART_DATA = {')

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [Convert]::ToBase64String($bytes)
    $sizeKB = [math]::Round($f.Length / 1024)
    $b64KB = [math]::Round($b64.Length / 1024)
    Write-Host ('  {0}: {1} KB -> {2} KB base64' -f $f.Name, $sizeKB, $b64KB)
    $line = "  '{0}': 'data:image/png;base64,{1}'," -f $f.Name, $b64
    [void]$sb.AppendLine($line)
}

[void]$sb.AppendLine('};')

[System.IO.File]::WriteAllText($outFile, $sb.ToString(), [System.Text.Encoding]::UTF8)
$sizeMB = [math]::Round((Get-Item $outFile).Length / 1048576, 1)
Write-Host ('Written: {0} ({1} MB)' -f $outFile, $sizeMB)

