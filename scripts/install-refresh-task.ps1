<#
.SYNOPSIS
  Register a Windows Task Scheduler entry that runs refresh-token-stats.ps1
  whenever the current user logs on (with an internal 18h throttle).

.DESCRIPTION
  - Trigger:  AtLogon for the current user
  - Action:   pwsh (or powershell) -ExecutionPolicy Bypass -File <abs path>\scripts\refresh-token-stats.ps1
  - Settings: hidden window, RunOnlyIfNetworkAvailable, StartWhenAvailable=$true
  - Run as:   current interactive user (no elevation needed — git uses your cached creds)

  Idempotent — re-running this script replaces the existing task.

.PARAMETER TaskName
  Defaults to "Portfolio - Refresh Token Stats".

.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File .\scripts\install-refresh-task.ps1
#>

[CmdletBinding()]
param(
  [string] $TaskName = 'Portfolio - Refresh Token Stats'
)

$ErrorActionPreference = 'Stop'

$ScriptDir  = $PSScriptRoot
$ScriptPath = Join-Path $ScriptDir 'refresh-token-stats.ps1'
if (-not (Test-Path $ScriptPath)) { throw "Missing $ScriptPath" }

# Prefer pwsh (PowerShell 7+) if available; fall back to Windows PowerShell.
$pwshCmd = (Get-Command pwsh -ErrorAction SilentlyContinue)
$exe = if ($pwshCmd) { $pwshCmd.Source } else { 'powershell.exe' }

# Build action / trigger / principal / settings
$args = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $ScriptPath
$action  = New-ScheduledTaskAction -Execute $exe -Argument $args -WorkingDirectory (Split-Path $ScriptDir -Parent)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal `
  -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive `
  -RunLevel Limited

# Replace any pre-existing task with the same name (idempotent).
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Replacing existing task '$TaskName'..."
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
}

Register-ScheduledTask `
  -TaskName    $TaskName `
  -Description 'Refreshes the AI token-stats widget on saitejamothukuri.com via `tokscale` whenever this user logs on (18h throttle).' `
  -Action      $action `
  -Trigger     $trigger `
  -Settings    $settings `
  -Principal   $principal | Out-Null

Write-Host ""
Write-Host "✅ Task '$TaskName' installed."
Write-Host ""
Write-Host "Triggers   :  At logon (your user)"
Write-Host "Throttle   :  18 hours (inside the script — won't re-run within that window)"
Write-Host "Logs       :  scripts\.refresh.log  (rolling, last 50 lines)"
Write-Host "State file :  scripts\.refresh-state.json"
Write-Host ""
Write-Host "Try it now manually:"
Write-Host "  pwsh -ExecutionPolicy Bypass -File .\scripts\refresh-token-stats.ps1 -Force"
Write-Host ""
Write-Host "To uninstall the task:"
Write-Host "  pwsh -ExecutionPolicy Bypass -File .\scripts\uninstall-refresh-task.ps1"
