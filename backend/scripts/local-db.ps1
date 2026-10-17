param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'status', 'ensure')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$dataDirectory = Join-Path $projectRoot '.local-postgres\data'
$logFile = Join-Path $projectRoot '.local-postgres\postgresql.log'
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
$serverOptions = '-p 5433 -h 127.0.0.1'

function Assert-LocalDatabaseAvailable {
  if (-not (Test-Path -LiteralPath $pgCtl -PathType Leaf)) {
    throw "PostgreSQL 18 was not found at $pgCtl"
  }

  if (-not (Test-Path -LiteralPath $dataDirectory -PathType Container)) {
    throw "The ConMat local PostgreSQL cluster has not been initialized at $dataDirectory"
  }
}

function Test-LocalDatabaseRunning {
  & $pgCtl status -D $dataDirectory *> $null
  return $LASTEXITCODE -eq 0
}

function Start-LocalDatabase {
  Assert-LocalDatabaseAvailable

  if (Test-LocalDatabaseRunning) {
    Write-Output 'ConMat local PostgreSQL is already running on port 5433.'
    return
  }

  & $pgCtl start -D $dataDirectory -l $logFile -o $serverOptions -w
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Output 'ConMat local PostgreSQL started on port 5433.'
}

switch ($Action) {
  'start' {
    Start-LocalDatabase
  }
  'ensure' {
    Start-LocalDatabase
  }
  'stop' {
    Assert-LocalDatabaseAvailable

    if (-not (Test-LocalDatabaseRunning)) {
      Write-Output 'ConMat local PostgreSQL is already stopped.'
      exit 0
    }

    & $pgCtl stop -D $dataDirectory -m fast -w
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Output 'ConMat local PostgreSQL stopped.'
  }
  'status' {
    Assert-LocalDatabaseAvailable

    if (Test-LocalDatabaseRunning) {
      Write-Output 'ConMat local PostgreSQL is running on port 5433.'
      exit 0
    }

    Write-Output 'ConMat local PostgreSQL is stopped.'
    exit 1
  }
}
