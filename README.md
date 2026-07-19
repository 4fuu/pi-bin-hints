# pi-bin-hints

Detect installed modern Unix-tool replacement binaries (`rg`, `fd`, `sd`, `bat`, …) **once per session** and inject a single stable line into pi's system prompt:

```
当前常用的Unix工具替代二进制可用有：rg/fd/sd/bat/...
```

## Why

Models default to `grep`/`find`/`sed`/`cat` even when faster modern replacements are installed. Telling the model exactly which of these binaries exist steers it to the better tool — without the model having to probe `PATH` itself.

## What it does

- On `session_start`, scans `PATH` directly (no subprocess spawning — a few milliseconds) for a curated list of ~30 candidates: `rg`, `fd`/`fdfind`, `sd`, `bat`/`batcat`, `eza`/`exa`/`lsd`, `delta`, `jq`, `yq`, `fzf`, `xh`, `hyperfine`, `dust`, `duf`, `procs`, `btm`, `zoxide`, `doggo`, `gping`, `hexyl`, `choose`, `sad`, `ast-grep`, `broot`, `tokei`, `watchexec`, `glow`.
- Caches the result and appends the **same constant line** to every turn's system prompt via `before_agent_start`.
- Injects nothing at all when no candidate binary is found.

## Prompt stability

Detection runs exactly once per session. The injected line is constant, so the rendered system prompt is byte-identical across turns — no prompt-cache invalidation, no per-turn probing, no prompt churn. Binaries installed mid-session are picked up on the next session start.

## Cross-platform

- **Windows**: `PATHEXT`-aware name matching (`rg.exe`, `fd.cmd`, …).
- **macOS / Linux**: exact name match plus executable-bit check.

## Installation

With pi:

```bash
pi install npm:@4fu/pi-bin-hints
```

Or link locally for development:

```bash
pi config set extensions./path/to/bin-hints
```

## Development

```bash
npm install
npm run typecheck
```

No build step — pi loads `src/index.ts` directly.

## License

MIT
