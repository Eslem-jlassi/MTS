$ErrorActionPreference = "Stop"

function Set-EnvDefault {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $currentValue = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($currentValue)) {
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
  }
}

Set-EnvDefault -Name "REACT_APP_API_URL" -Value "http://localhost:8085/api"
Set-EnvDefault -Name "REACT_APP_DEMO_MODE" -Value "false"
Set-EnvDefault `
  -Name "REACT_APP_GOOGLE_OAUTH_ALLOWED_ORIGINS" `
  -Value "http://localhost,http://127.0.0.1,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

$clientId = [Environment]::GetEnvironmentVariable("REACT_APP_GOOGLE_OAUTH_CLIENT_ID", "Process")
$oauthEnabled = [Environment]::GetEnvironmentVariable("REACT_APP_GOOGLE_OAUTH_ENABLED", "Process")

if ([string]::IsNullOrWhiteSpace($oauthEnabled)) {
  $defaultOAuthValue = if ([string]::IsNullOrWhiteSpace($clientId)) { "false" } else { "true" }
  [Environment]::SetEnvironmentVariable("REACT_APP_GOOGLE_OAUTH_ENABLED", $defaultOAuthValue, "Process")
}

$reactScripts = Join-Path $PSScriptRoot "..\node_modules\.bin\react-scripts.cmd"

Write-Host "Building demo bundle with:"
Write-Host "  REACT_APP_API_URL=$([Environment]::GetEnvironmentVariable('REACT_APP_API_URL', 'Process'))"
Write-Host "  REACT_APP_DEMO_MODE=$([Environment]::GetEnvironmentVariable('REACT_APP_DEMO_MODE', 'Process'))"
Write-Host "  REACT_APP_GOOGLE_OAUTH_ENABLED=$([Environment]::GetEnvironmentVariable('REACT_APP_GOOGLE_OAUTH_ENABLED', 'Process'))"

& $reactScripts build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
