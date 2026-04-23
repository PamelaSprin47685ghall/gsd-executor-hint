import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const gsdHome = process.env.GSD_HOME || join(homedir(), ".gsd");

/**
 * Load EXECUTOR.md content from disk.
 *
 * Resolution order:
 *   1. Project-level:  {cwd}/EXECUTOR.md
 *   2. Global-level:   ~/.gsd/agent/EXECUTOR.md
 *
 * Returns null when neither file exists or both are empty.
 */
function loadExecutorHint(cwd) {
  const projectPath = join(cwd, "EXECUTOR.md");
  if (existsSync(projectPath)) {
    try {
      const content = readFileSync(projectPath, "utf-8").trim();
      if (content) return content;
    } catch {
      /* ignore */
    }
  }

  const globalPath = join(gsdHome, "agent", "EXECUTOR.md");
  if (existsSync(globalPath)) {
    try {
      const content = readFileSync(globalPath, "utf-8").trim();
      if (content) return content;
    } catch {
      /* ignore */
    }
  }

  return null;
}

/**
 * GSD Ecosystem Extension — Executor Hint
 *
 * Automatically injects EXECUTOR.md into the system prompt whenever GSD
 * auto-mode is in the **executing** phase (covers both sequential
 * execute-task and reactive-execute dispatch).
 */
export default function executorHintExtension(api) {
  api.on("before_agent_start", async (event) => {
    const phase = api.getPhase();
    if (phase !== "executing") {
      return undefined;
    }

    const hint = loadExecutorHint(process.cwd());
    if (!hint) {
      return undefined;
    }

    const block =
      `\n\n` +
      `[EXECUTOR HINT — User-provided instructions for task execution]\n\n` +
      `${hint}`;

    return {
      systemPrompt: event.systemPrompt + block,
    };
  });
}
