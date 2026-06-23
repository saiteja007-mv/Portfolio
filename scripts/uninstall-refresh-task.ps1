<#
.SYNOPSIS
  Remove the Task Scheduler entry for the token-stats refresh.

.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File .\scripts\uninstall-refresh-task.ps1
#>

[CmdletBinding()]
param(
  [string] $TaskName = 'Portfolio - Refresh Token Stats'
)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "No task named '$TaskName' is registered. Nothing to do."
  exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
Write-Host "✅ Removed task '$TaskName'."
