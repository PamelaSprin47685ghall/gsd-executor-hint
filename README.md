# GSD Executor Hint

Automatically injects `EXECUTOR.md` into the system prompt during GSD execution phases.

## Install

```bash
gsd install <path-to-this-repo>
```

## Configuration

The plugin searches for `EXECUTOR.md` in:
1. Project root (where `.gsd/` is located)
2. Global config (`~/.gsd/agent/EXECUTOR.md`)
