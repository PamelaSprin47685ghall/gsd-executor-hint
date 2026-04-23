# gsd-executor-hint

GSD Ecosystem Extension — injects `EXECUTOR.md` into the system prompt during the **executing** phase.

## What it does

When GSD auto-mode dispatches an `execute-task` (or `reactive-execute`) unit, this extension reads `EXECUTOR.md` and appends its contents to the system prompt. This lets you place user-specific coding conventions, guard-rails, or style guides that apply **only while code is being written**, without bloating planning or research turns.

## File resolution

1. **Project-level**: `{cwd}/EXECUTOR.md`
2. **Global-level**: `~/.gsd/agent/EXECUTOR.md`

The first file found wins. If neither exists the extension is silently skipped.

## Install

```bash
cd /path/to/your/project
gsd extensions install /path/to/gsd-executor-hint
```

Then restart GSD to activate.

## Usage

Create an `EXECUTOR.md` in your project root (or in `~/.gsd/agent/EXECUTOR.md` for cross-project hints):

```markdown
# Executor Instructions

- Always run the test suite before claiming a task is complete.
- Prefer `async/await` over raw Promises.
- When editing TypeScript, keep strict-null-checks compliance in mind.
```

The next time GSD auto-mode enters the **executing** phase, these instructions will appear in the system prompt.

## Why a separate file instead of AGENTS.md?

`AGENTS.md` (and `CLAUDE.md`) are loaded by the core agent on **every** turn — planning, research, discussion, and execution. `EXECUTOR.md` is scoped to the execution phase only, keeping planning prompts lean while giving the executor full context.
