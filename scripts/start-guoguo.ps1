$ErrorActionPreference = "Stop"

$Root = Split-Path $PSScriptRoot -Parent
$ServerDir = Join-Path $Root "apps\server"
$Entry = Join-Path $ServerDir "dist\index.js"
$Node = "C:\Program Files\nodejs\node.exe"
$LogDir = Join-Path $Root "logs"
$LogFile = Join-Path $LogDir "guoguo.log"

if (-not (Test-Path $Node)) {
  $fromPath = Get-Command node -ErrorAction SilentlyContinue
  if ($fromPath) { $Node = $fromPath.Source }
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log($message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Test-PortInUse([int]$Port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$conns
  } catch {
    $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    return [bool]$listener
  }
}

Write-Log "start-guoguo.ps1 begin"

if (-not (Test-Path $Node)) {
  Write-Log "ERROR: node.exe not found"
  exit 1
}

if (Test-PortInUse 3001) {
  Write-Log "port 3001 already in use, skip start"
  exit 0
}

if (-not (Test-Path $Entry)) {
  Write-Log "dist missing, running npm run build"
  Set-Location $Root
  npm run build
  if (-not (Test-Path $Entry)) {
    Write-Log "ERROR: build did not produce dist/index.js"
    exit 1
  }
}

Write-Log "starting $Node $Entry"
Set-Location $ServerDir
& $Node $Entry >> $LogFile 2>&1
Write-Log "process exited with code $LASTEXITCODE"
exit $LASTEXITCODE
