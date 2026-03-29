@echo off
setlocal

REM Ensure correct working directory
cd /d C:\ai\tabby-qwen 2>nul
echo Working directory: %CD%
echo.

REM Show model folder contents
echo === model\qwen contents ===
if exist ".\model\qwen" (
  dir /A /O:N ".\model\qwen"
) else (
  echo ERROR: .\model\qwen does not exist
  pause
  exit /b 1
)
echo.

REM Show tabby.json if present
echo === model\qwen\tabby.json ===
if exist ".\model\qwen\tabby.json" (
  type ".\model\qwen\tabby.json"
) else (
  echo (tabby.json not found)
)
echo.

REM Show local tabby config files if present
echo === tabby.yaml (cwd) ===
if exist ".\tabby.yaml" ( type ".\tabby.yaml" ) else ( echo (no tabby.yaml in cwd) )
echo.
echo === tabby_qwen.yml (cwd) ===
if exist ".\tabby_qwen.yml" ( type ".\tabby_qwen.yml" ) else ( echo (no tabby_qwen.yml in cwd) )
echo.

REM Show tabby.exe version if available
echo === tabby.exe --version ===
if exist ".\tabby.exe" (
  .\tabby.exe --version 2>nul || echo (tabby.exe --version failed)
) else (
  echo ERROR: tabby.exe not found in %CD%
  pause
  exit /b 1
)
echo.

REM Show file ACLs for the gguf
echo === icacls for GGUF ===
for %%F in (".\model\qwen\*.gguf") do (
  if exist %%~fF (
    icacls "%%~fF"
  ) else (
    echo No .gguf found in .\model\qwen
  )
)
echo.

REM Unblock files (best-effort)
echo Attempting to unblock tabby.exe and GGUF files (PowerShell)
powershell -NoProfile -Command "Try { Unblock-File -Path '.\tabby.exe' -ErrorAction SilentlyContinue; Unblock-File -Path '.\model\qwen\*.gguf' -ErrorAction SilentlyContinue; Write-Host 'Unblock attempted.' } Catch { Write-Host 'Unblock skipped or failed.' }"
echo.

REM Run Tabby with full backtrace and capture output
echo Launching Tabby with RUST_BACKTRACE=full. Output will be saved to tabby-launch.log
set RUST_BACKTRACE=full
REM Run and capture both stdout and stderr
.\tabby.exe serve --chat-model qwen --port 5200 --device cpu > tabby-launch.log 2>&1

echo.
echo Tabby process exited. Showing first 80 lines of tabby-launch.log:
echo ------------------------------------------------------------
powershell -NoProfile -Command "Get-Content .\tabby-launch.log -TotalCount 80 | ForEach-Object { Write-Host $_ }"
echo ------------------------------------------------------------
echo If Tabby crashed, please copy and paste the lines above into the chat.
echo The full log is at: %CD%\tabby-launch.log
pause
endlocal