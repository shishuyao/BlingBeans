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

function Test-SourceNewer([datetime]$BuiltAt) {
  $roots = @(
    (Join-Path $Root "apps\server\src"),
    (Join-Path $Root "apps\server\prisma\schema.prisma"),
    (Join-Path $Root "apps\web\src"),
    (Join-Path $Root "packages\shared\src")
  )
  foreach ($item in $roots) {
    if (-not (Test-Path $item)) { continue }
    $info = Get-Item $item
    $files = if ($info.PSIsContainer) {
      Get-ChildItem -Path $item -Recurse -File -Include *.ts, *.tsx, *.css, *.prisma
    } else {
      @($info)
    }
    foreach ($f in $files) {
      if ($f.FullName -match '\\dist\\') { continue }
      if ($f.LastWriteTime -gt $BuiltAt) { return $true }
    }
  }
  return $false
}

function Stop-DistServer {
  $conns = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    $cmd = [string]$proc.CommandLine
    if ($cmd -like '*dist\index.js*' -or $cmd -like '*dist/index.js*') {
      Write-Log "stopping stale dist server pid $($proc.ProcessId)"
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 1
    }
  }
}

Write-Log "start-guoguo.ps1 begin"

if (-not (Test-Path $Node)) {
  Write-Log "ERROR: node.exe not found"
  exit 1
}

$needsBuild = -not (Test-Path $Entry)
if (-not $needsBuild) {
  $needsBuild = Test-SourceNewer (Get-Item $Entry).LastWriteTime
}

if ($needsBuild) {
  Write-Log "source newer than dist, rebuilding"
  Stop-DistServer
  Set-Location $Root
  npm run db:push -w @guoguo/server
  if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: db push failed"
    exit 1
  }
  npm run build
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Entry)) {
    Write-Log "ERROR: build did not produce dist/index.js"
    exit 1
  }
}

if (Test-PortInUse 3001) {
  Write-Log "port 3001 already in use, skip start"
  exit 0
}

Write-Log "starting $Node $Entry"
Set-Location $ServerDir
& $Node $Entry >> $LogFile 2>&1
Write-Log "process exited with code $LASTEXITCODE"
exit $LASTEXITCODE
