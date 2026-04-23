# GSD Executor Hint Extension

Automatically injects `EXECUTOR.md` into the system prompt whenever GSD auto-mode is in the **executing** phase (covers both sequential execute-task and reactive-execute dispatch).

## What it does

- Detects the executing phase via `api.getPhase()` (GSD ecosystem) or prompt heuristics (standard pi).
- Loads `EXECUTOR.md` from disk, with project-level takes precedence over global.
- Injects the hint as a marked block at the end of the system prompt.
- Shows a one-time notification when the extension loads.

## EXECUTOR.md resolution order

1. **Project-level:** `{cwd}/EXECUTOR.md`
2. **Global-level:** `~/.gsd/agent/EXECUTOR.md`

## Install

Place this folder in one of these locations:

- Global: `~/.pi/agent/extensions/gsd-executor-hint/`
- Project-local: `.gsd/extensions/gsd-executor-hint/`

Then reload GSD:

```bash
/reload
```

## Project structure

```
src/
  constants.js    # LOADED_MESSAGE
  utils.js        # notify helper, noop
  controller.js   # Phase detection, hint loading, injection logic
  index.js        # Plugin entry point
test/
  test.js         # Unit + integration tests
```

## Test

```bash
npm test
```
