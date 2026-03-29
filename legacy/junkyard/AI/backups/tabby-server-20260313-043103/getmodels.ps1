# Move any .gguf models found in common locations into the canonical models folder.
# It will not overwrite existing files with the same name.
$dest = "C:\AI\tabby-server\models"
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }

# Common search roots to scan quickly
$roots = @(
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\AppData\Local\Temp",
    "C:\",
    "$env:USERPROFILE"
)

# File names you expect to centralize
$expectedNames = @(
    "deepseek-coder-1.3b-instruct.Q4_K_M.gguf",
    "model-00001-of-00001.gguf"
)

# Find and move models
foreach ($root in $roots) {
    try {
        $found = Get-ChildItem -Path $root -Recurse -Filter "*.gguf" -ErrorAction SilentlyContinue -Force
    } catch {
        continue
    }
    foreach ($f in $found) {
        $target = Join-Path $dest $($f.Name)
        if (-not (Test-Path $target)) {
            try {
                Move-Item -Path $f.FullName -Destination $target -Force
            } catch {
                # If move fails (permission), try copy then remove
                try {
                    Copy-Item -Path $f.FullName -Destination $target -Force
                    Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
                } catch {
                    # ignore
                }
            }
        }
    }
}

# If expected names are not present, leave a note in the log
foreach ($name in $expectedNames) {
    $p = Join-Path $dest $name
    if (-not (Test-Path $p)) {
        Add-Content -Path "C:\AI\tabby-server\move_models.log" -Value "$(Get-Date -Format o) MISSING: $name"
    }
}