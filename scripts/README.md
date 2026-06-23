# Token-stats auto-refresh

Auto-syncs the **AI Token Usage** desktop widget on saitejamothukuri.com from your local
`tokscale` data — whenever you log on, with a one-per-day throttle.

## Files

- `refresh-token-stats.ps1` — the worker. Reads `tokscale --json` + `tokscale graph`,
  rewrites the `data-stat="..."` spans in `index.html`, commits + pushes only when
  values actually changed.
- `install-refresh-task.ps1` — registers a Windows Task Scheduler task that runs the
  worker at logon (hidden, network-aware, current user, no elevation).
- `uninstall-refresh-task.ps1` — removes that task.
- `.refresh-state.json` — last run timestamp + last values (gitignored ideally).
- `.refresh.log` — rolling 50-line log of every attempt.

## Install (one-time)

From the repo root, in PowerShell 7+:

```powershell
pwsh -ExecutionPolicy Bypass -File .\scripts\install-refresh-task.ps1
```

Now every time you log on, the script will (silently, in the background):

1. Skip if the last successful run was less than **18 hours** ago.
2. Else run `tokscale --json` + `tokscale graph` and compute fresh headline values.
3. Replace the 5 `data-stat="..."` spans in `index.html`.
4. If anything actually changed, commit (`chore(stats): refresh ...`) and push to
   `origin`. Vercel auto-deploys.

## Manual / dry-run

```powershell
# See what it would do without writing or committing
pwsh -ExecutionPolicy Bypass -File .\scripts\refresh-token-stats.ps1 -DryRun -Force

# Force a refresh now, bypassing the 18h throttle
pwsh -ExecutionPolicy Bypass -File .\scripts\refresh-token-stats.ps1 -Force

# Refresh + commit locally, but don't push (good for testing)
pwsh -ExecutionPolicy Bypass -File .\scripts\refresh-token-stats.ps1 -Force -NoPush
```

## Tuning

- **Throttle**: `-ThrottleHours 6` (or any int) on the worker.
- **Skip push**: `-NoPush`.
- **Change branch / remote**: the script uses your default `git push` — set your
  upstream once (`git push -u origin main`) and it just works.

## Logs

Tail the rolling log:

```powershell
Get-Content .\scripts\.refresh.log -Tail 20
```

Each line is `<ISO timestamp> [INFO|WARN|ERROR] <message>`.

## Uninstall

```powershell
pwsh -ExecutionPolicy Bypass -File .\scripts\uninstall-refresh-task.ps1
```

## Notes

- The widget's HTML uses `data-stat="tokens|spend|model|msgs-days|since"` markers so
  the regex-based replacement is bulletproof — feel free to restyle the chips around
  them.
- The worker requires `tokscale` on `PATH` and `git` configured for `origin`.
- Friendly model labels: `claude-opus-4-7` → `Claude Opus 4.7`, `gpt-5.5` → `GPT-5.5`,
  etc. When Opus 4.7 and 4.8 both appear in your top entries the label collapses to
  `Claude Opus 4.7 / 4.8`.
