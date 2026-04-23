import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

/**
 * Locate the real project root.
 * Handles GSD worktrees by backtracking to the parent project directory.
 */
function getProjectRoot(cwd) {
	if (process.env.GSD_PROJECT_ROOT) return process.env.GSD_PROJECT_ROOT;

	let curr = resolve(cwd);
	while (curr !== resolve(curr, "..")) {
		if (existsSync(join(curr, ".gsd"))) {
			const parts = curr.split(/[/\\]/);
			const gsdIdx = parts.lastIndexOf(".gsd");
			if (gsdIdx !== -1 && parts[gsdIdx + 1] === "worktrees") {
				return resolve(curr, "..", "..", "..");
			}
			return curr;
		}
		curr = resolve(curr, "..");
	}
	return null;
}

/**
 * Audit: Is this prompt part of GSD's autonomous execution flow?
 */
function isGSDExecution(event) {
	if (!event) return false;
	
	const sys = (event.systemPrompt ?? "").toLowerCase();
	const usr = (event.prompt ?? "").toLowerCase();

	// 1. Check for GSD specific markers in system prompt
	if (sys.includes("gsd") || sys.includes("get shit done")) {
		const isMacro = sys.includes("research-milestone") || sys.includes("plan-milestone") || 
		                sys.includes("research-slice") || sys.includes("plan-slice");
		if (!isMacro) return true;
	}

	// 2. Check for GSD auto-mode dispatch patterns in the user prompt
	const dispatchPatterns = [
		"execute the next task",
		"resume interrupted work",
		"summarize the completed work",
		"verify the milestone",
		"run uat",
		"reassess the roadmap",
		"replan the slice",
		"evaluate quality gates"
	];
	
	if (dispatchPatterns.some(p => usr.includes(p))) return true;

	return false;
}

function loadHint() {
	const root = getProjectRoot(process.cwd());
	const paths = [
		root ? join(root, "EXECUTOR.md") : null,
		join(GSD_HOME, "agent", "EXECUTOR.md")
	].filter(Boolean);

	for (const p of paths) {
		if (existsSync(p)) {
			try {
				const content = readFileSync(p, "utf-8").trim();
				if (content) return content;
			} catch { /* skip */ }
		}
	}
	return null;
}

export function createExecutorHintController() {
	return {
		async getHintMessage(event) {
			if (!isGSDExecution(event)) return;

			const hint = loadHint();
			if (!hint) return;

			// Return as a VISIBLE USER MESSAGE (display: true) for debugging.
			// This message is added to history before the main prompt.
			return {
				message: {
					customType: "gsd-executor-hint",
					content: `[MANDATORY EXECUTOR GUIDANCE]\n${hint}`,
					display: true // Changed to true for debugging as requested
				}
			};
		}
	};
}
