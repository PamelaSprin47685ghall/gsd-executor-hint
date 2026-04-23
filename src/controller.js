import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

/**
 * Load EXECUTOR.md content from disk.
 *
 * Resolution order:
 *   1. Project Root:   {GSD_PROJECT_ROOT}/EXECUTOR.md
 *   2. Worktree CWD:   {cwd}/EXECUTOR.md
 *   3. Global-level:   ~/.gsd/agent/EXECUTOR.md
 */
export function loadExecutorHint(cwd) {
	const projectRoot = process.env.GSD_PROJECT_ROOT;
	const searchPaths = [];
	
	if (projectRoot) {
		searchPaths.push(join(projectRoot, "EXECUTOR.md"));
	}
	searchPaths.push(join(cwd, "EXECUTOR.md"));
	searchPaths.push(join(GSD_HOME, "agent", "EXECUTOR.md"));

	for (const p of searchPaths) {
		if (existsSync(p)) {
			try {
				const content = readFileSync(p, "utf-8").trim();
				if (content) return content;
			} catch { /* ignore */ }
		}
	}

	return null;
}

/**
 * Detect whether the current prompt is in a phase where executor hints are relevant.
 * Covers: executing, verifying, summarizing.
 */
export function isRelevantPhase(event) {
	// 1. Ecosystem API check
	if (typeof event.api?.getPhase === "function") {
		const phase = event.api.getPhase();
		return ["executing", "verifying", "summarizing"].includes(phase);
	}

	// 2. Prompt heuristics fallback
	const prompt = event.prompt ?? "";
	return (
		// Task execution
		prompt.includes("## Inlined Task Plan") ||
		// Verification
		prompt.includes("## Verification Evidence") ||
		// Summarization
		prompt.includes("## Task Summary") ||
		prompt.includes("## Slice Summary")
	);
}

function buildHintBlock(hint) {
	return (
		`\n\n` +
		`[EXECUTOR HINT — User-provided instructions for task execution/verification/summary]\n\n` +
		`${hint}`
	);
}

export function createExecutorHintController(pi) {
	return {
		async injectHint(event) {
			if (!isRelevantPhase(event)) return undefined;

			const hint = loadExecutorHint(process.cwd());
			if (!hint) return undefined;

			const block = buildHintBlock(hint);
			return {
				systemPrompt: (event.systemPrompt ?? "") + block,
			};
		},
	};
}
