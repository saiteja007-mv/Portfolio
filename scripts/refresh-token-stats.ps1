<#
.SYNOPSIS
  Refresh the AI token-stats widget on saitejamothukuri.com from local `tokscale` data.

.DESCRIPTION
  Runs on Windows logon via Task Scheduler (see install-refresh-task.ps1). Pulls fresh
  data from `tokscale --json` + `tokscale graph`, rewrites the data-stat-marked spans in
  index.html, and commits + pushes to origin/main ONLY when values actually change.

  A throttle (default 18h) prevents repeat work on the same day. State + a rolling 50-line
  log are kept under scripts/.refresh-state.json and scripts/.refresh.log.

.PARAMETER ThrottleHours
  Skip the run entirely if the last successful run was less than this many hours ago.
  Default 18.

.PARAMETER DryRun
  Compute new values + show the diff, but DO NOT write the file, commit, or push.

.PARAMETER Force
  Ignore the throttle. Useful for manual refresh.

.PARAMETER NoPush
  Commit locally but skip `git push` (useful for testing).

.EXAMPLE
  # Manual dry-run (no writes, no commits)
  pwsh -File .\scripts\refresh-token-stats.ps1 -DryRun -Force

.EXAMPLE
  # Force a refresh ignoring throttle (commits + pushes)
  pwsh -File .\scripts\refresh-token-stats.ps1 -Force
#>

[CmdletBinding()]
param(
  [int]    $ThrottleHours = 18,
  [switch] $DryRun,
  [switch] $Force,
  [switch] $NoPush
)

$ErrorActionPreference = 'Stop'

# ── Paths ──────────────────────────────────────────────────────────────
$ScriptDir = $PSScriptRoot
$RepoRoot  = Split-Path $ScriptDir -Parent
$IndexPath = Join-Path $RepoRoot 'index.html'
$StateFile = Join-Path $ScriptDir '.refresh-state.json'
$LogFile   = Join-Path $ScriptDir '.refresh.log'

# ── Logging (rolling 50 lines) ────────────────────────────────────────
function Write-Log {
  param([string]$Level, [string]$Message)
  $ts = (Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz')
  $line = "$ts [$Level] $Message"
  Write-Host $line
  try {
    Add-Content -Path $LogFile -Value $line -ErrorAction Stop
    $all = Get-Content -Path $LogFile -ErrorAction Stop
    if ($all.Count -gt 50) {
      $all = $all[-50..-1]
      Set-Content -Path $LogFile -Value $all -ErrorAction Stop
    }
  } catch { }
}

function Fail {
  param([string]$Reason)
  Write-Log 'ERROR' $Reason
  exit 1
}

# ── Throttle check ────────────────────────────────────────────────────
$state = $null
if (Test-Path $StateFile) {
  try { $state = Get-Content $StateFile -Raw | ConvertFrom-Json } catch { $state = $null }
}
if (-not $Force -and $state -and $state.lastRunISO) {
  try {
    $last = [DateTimeOffset]::Parse($state.lastRunISO)
    $elapsedH = ([DateTimeOffset]::Now - $last).TotalHours
    if ($elapsedH -lt $ThrottleHours) {
      Write-Log 'INFO' ("Throttled: last run {0:N1}h ago (<{1}h). Use -Force to override." -f $elapsedH, $ThrottleHours)
      exit 0
    }
  } catch { }
}

# ── Locate tokscale ───────────────────────────────────────────────────
$tokscale = (Get-Command tokscale -ErrorAction SilentlyContinue)
if (-not $tokscale) { Fail "tokscale not found on PATH. Install or add to PATH." }

Write-Log 'INFO' 'Running tokscale --json + graph...'
$rawDefault = & tokscale --json 2>$null
$rawGraph   = & tokscale graph     2>$null
if ($LASTEXITCODE -ne 0 -or -not $rawDefault -or -not $rawGraph) {
  Fail "tokscale exited non-zero or empty output (exit=$LASTEXITCODE)."
}

try {
  $d = $rawDefault | ConvertFrom-Json
  $g = $rawGraph   | ConvertFrom-Json
} catch { Fail "Failed to parse tokscale JSON: $_" }

# ── Compute headline stats ────────────────────────────────────────────
function Format-Tokens {
  param([double]$n)
  if ($n -ge 1e9) { return ('{0:N2}B' -f ($n / 1e9)) }
  if ($n -ge 1e6) { return ('{0:N1}M' -f ($n / 1e6)) }
  if ($n -ge 1e3) { return ('{0:N1}K' -f ($n / 1e3)) }
  return "$n"
}

$totalTok = [double]($g.summary.totalTokens)
$totalUSD = [double]($g.summary.totalCost)
$totalMsg = [int]($d.totalMessages)
$activeDays = [int]($g.summary.activeDays)
$startISO = $g.meta.dateRange.start         # e.g. 2025-09-28

# Top model by cost
$top = $d.entries | Sort-Object -Property cost -Descending | Select-Object -First 1
$topRawModel = ''
if ($top) { $topRawModel = "$($top.model)" }

# Friendly model label (Claude Opus 4.7/4.8 family collapse, GPT-5.x, etc.)
function Friendly-Model {
  param([string]$id)
  if (-not $id) { return 'unknown' }
  # Claude Opus 4-x → "Claude Opus 4.x"
  if ($id -match 'claude-opus-4-(\d+)') { return "Claude Opus 4.$($Matches[1])" }
  if ($id -match 'claude-sonnet-4-(\d+)') { return "Claude Sonnet 4.$($Matches[1])" }
  if ($id -match 'claude-haiku-4-(\d+)') { return "Claude Haiku 4.$($Matches[1])" }
  if ($id -match 'claude-fable-(\d+)') { return "Claude Fable $($Matches[1])" }
  if ($id -match 'gpt-5\.([0-9]+)(?:-codex)?(?:-max)?') { return "GPT-5.$($Matches[1])" }
  if ($id -match 'gpt-5-codex') { return 'GPT-5 (codex)' }
  if ($id -match 'gemini-(\d+\.?\d*)') { return "Gemini $($Matches[1])" }
  return $id
}
$topModel = Friendly-Model $topRawModel

# Collapse Claude Opus 4.x family if 2+ variants appear in the top entries.
# Dedup while PRESERVING cost order (not alphabetical) so 4.7 / 4.8 wins over 4.6.
$opusFamily = $d.entries | Where-Object { $_.model -match '^claude-opus-4-\d+$' } | Sort-Object -Property cost -Descending
if ($opusFamily.Count -ge 2 -and $top.model -match '^claude-opus-4-\d+$') {
  $seen = [System.Collections.Generic.HashSet[string]]::new()
  $orderedVariants = @()
  foreach ($e in $opusFamily) {
    $v = ($e.model -replace 'claude-opus-4-', '4.')
    if ($seen.Add($v)) { $orderedVariants += $v }
  }
  if ($orderedVariants.Count -ge 2) {
    # Sort the picked top-2 ascending for a "4.7 / 4.8" feel (still cost-driven selection).
    $top2 = $orderedVariants | Select-Object -First 2 | Sort-Object
    $topModel = "Claude Opus $($top2 -join ' / ')"
  }
}

# "since <Mon YYYY>"
$sinceText = 'since ' + ([DateTime]::Parse($startISO).ToString('MMM yyyy'))

# Headline string values
$vTokens   = Format-Tokens $totalTok                  # e.g. "4.32B"
$vSpend    = ('${0:N0}' -f $totalUSD)                 # e.g. "$4,518"
$vModel    = $topModel                                # e.g. "Claude Opus 4.7 / 4.8"
$vMsgsDays = ('{0:N0} msgs · {1} days' -f $totalMsg, $activeDays)
$vSince    = $sinceText

$new = @{
  tokens     = $vTokens
  spend      = $vSpend
  model      = $vModel
  'msgs-days'= $vMsgsDays
  since      = $vSince
}

Write-Log 'INFO' ("Computed: tokens={0} spend={1} model='{2}' msgs/days='{3}' since='{4}'" -f $vTokens, $vSpend, $vModel, $vMsgsDays, $vSince)

# ── Detect change vs last known values ────────────────────────────────
$prev = $null
if ($state -and $state.values) { $prev = $state.values }
$changed = $false
foreach ($k in $new.Keys) {
  $oldV = ''
  if ($prev) { $oldV = "$($prev.$k)" }
  if ($new[$k] -ne $oldV) { $changed = $true; break }
}

# ── Replace data-stat spans in index.html ─────────────────────────────
if (-not (Test-Path $IndexPath)) { Fail "index.html not found at $IndexPath" }
$html = Get-Content $IndexPath -Raw

function Replace-Stat {
  param([string]$Content, [string]$Key, [string]$Value)
  # Match `data-stat="<key>" ...> ... </span>` (any whitespace), preserve attrs.
  # Apply HTML-safe substitution: turn ASCII spaces in the model label into &nbsp;
  # only when length > 18 (keeps multi-word labels from wrapping awkwardly).
  $safe = if ($Key -eq 'model' -and $Value.Length -gt 18) {
    ($Value -replace ' ', '&nbsp;')
  } elseif ($Key -eq 'since') {
    ($Value -replace ' (\d{4})$', '&nbsp;$1')   # bind year non-breaking
  } else { $Value }
  $pattern = '(?s)(<span\b[^>]*data-stat="' + [Regex]::Escape($Key) + '"[^>]*>)(.*?)(</span>)'
  $rx = [System.Text.RegularExpressions.Regex]::new($pattern)
  $replaced = $rx.Replace($Content, ('${1}' + ([Regex]::Escape($safe) -replace '\\([^\\])','$1') + '${3}'), 1)
  return $replaced
}

$newHtml = $html
foreach ($k in @('tokens','spend','model','msgs-days','since')) {
  $newHtml = Replace-Stat -Content $newHtml -Key $k -Value $new[$k]
}

if ($newHtml -eq $html) {
  Write-Log 'INFO' 'No textual change in index.html — values already current.'
} else {
  if ($DryRun) {
    Write-Log 'INFO' '[DRY-RUN] Would write index.html with refreshed stats.'
  } else {
    Set-Content -Path $IndexPath -Value $newHtml -Encoding UTF8
    Write-Log 'INFO' 'Wrote index.html.'
  }
}

# Update state file (even when no change, refresh the timestamp for throttle)
$stateOut = @{
  lastRunISO = (Get-Date -Format 'o')
  values     = $new
}
if (-not $DryRun) {
  $stateOut | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8
}

# ── Git: commit + push if changed ─────────────────────────────────────
if ($DryRun -or ($newHtml -eq $html) -or -not $changed) {
  Write-Log 'INFO' 'Skip git commit (no value change or dry-run).'
  exit 0
}

Set-Location $RepoRoot
$gitStatus = (& git status --porcelain -- index.html scripts/.refresh-state.json) 2>$null
if (-not $gitStatus) {
  Write-Log 'INFO' 'Git reports nothing staged — exiting.'
  exit 0
}

try {
  & git add index.html scripts/.refresh-state.json | Out-Null
  $msg = ('chore(stats): refresh {0} tokens / {1} / {2}' -f $vTokens, $vSpend, $vModel)
  & git commit -m $msg | Out-Null
  Write-Log 'INFO' "Committed: $msg"
} catch {
  Write-Log 'ERROR' "git commit failed: $_"
  exit 1
}

if (-not $NoPush) {
  try {
    & git push 2>&1 | Out-Null
    Write-Log 'INFO' 'Pushed to origin.'
  } catch {
    Write-Log 'WARN' "git push failed (will be retried next run): $_"
  }
}

Write-Log 'INFO' 'Done.'
exit 0
