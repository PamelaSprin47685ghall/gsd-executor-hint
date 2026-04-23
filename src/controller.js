import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

/**
 * Load EXECUTOR.md content from disk.
 *
 * Resolution order:
 *   1. Project-level:  {cwd}/EXECUTOR.md
 *   2. Global-level:   ~/.gsd/agent/EXECUTOR.md
 *
 * Returns null when neither file exists or both are empty.
 *
 * @param {string} cwd - Current working directory
 * @returns {string|null}
 */
export function loadExecutorHint(cwd) {
	// 1. Project-level
	const projectPath = join(cwd, "EXECUTOR.md");
	if (existsSync(projectPath)) {
		try {
			const content = readFileSync(projectPath, "utf-8").trim();
			if (content) return content;
		} catch {
			/* ignore read errors */
		}
	}

	// 2. Global-level
	const globalPath = join(GSD_HOME, "agent", "EXECUTOR.md");
	if (existsSync(globalPath)) {
		try {
			const content = readFileSync(globalPath, "utf-8").trim();
			if (content) return content;
		} catch {
			/* ignore read errors */
		}
	}

	return null;
}

/**
 * Detect whether the current prompt is in the GSD executing phase.
 *
 * When loaded as a GSD ecosystem extension (from .gsd/extensions/),
 * the pi `api` is available and exposes getPhase().
 *
 * When loaded as a standard pi extension (via `pi extensions install`),
 * getPhase() is unavailable. We fall back to prompt-content heuristics:
 * the execute-task prompt always inlines the task plan with this header.
 *
 * @param {object} event - before_agent_start event payload
 * @returns {boolean}
 */
export function isExecutingPhase(event) {
	if (typeof event.api?.getPhase === "function") {
		return event.api.getPhase() === "executing";
	}
	return (
		event.prompt?.includes(
			"## Inlined Task Plan (authoritative local execution contract)"
		) ?? false
	);
}

/**
 * Build the system-prompt injection block.
 *
 * @param {string} hint - Raw EXECUTOR.md content
 * @returns {string}
 */
function buildHintBlock(hint) {
	return (
		`\n\n` +
		`[EXECUTOR HINT — User-provided instructions for task execution]\n\n` +
		`${hint}`
	);
}

/**
 * Create the executor-hint controller.
 *
 * @param {object} pi - pi instance
 * @returns {object} controller
 */
export function createExecutorHintController(pi) {
	return {
		/**
		 * Inject EXECUTOR.md into the system prompt.
		 *
		 * Returns a patch object that GSD will merge into the prompt state.
		 * Returning undefined signals "no change needed".
		 *
		 * @param {object} event - before_agent_start event payload
		 * @returns {Promise<{systemPrompt: string}|undefined>}
		 */
		async injectHint(event) {
			if (!isExecutingPhase(event)) return undefined;

			const hint = loadExecutorHint(process.cwd());
			if (!hint) return undefined;

			const block = buildHintBlock(hint);
			return {
				systemPrompt: event.systemPrompt + block,
			};
		},
	};
}
