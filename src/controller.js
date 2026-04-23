import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

/**
 * Locate the real project root.
 * Handles GSD worktrees by回溯 to the parent project directory.
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
 * Audit: Is this Turn part of GSD's autonomous execution flow?
 */
function isGSDExecution(event) {
	if (!event) return false;
	
	const sys = (event.systemPrompt ?? "").toLowerCase();
	const usr = (event.prompt ?? "").toLowerCase();

	// 1. Check for GSD specific markers in system prompt (works if running after GSD extension)
	if (sys.includes("gsd") || sys.includes("get shit done")) {
		// Filter out macro-phases
		const isMacro = sys.includes("research-milestone") || sys.includes("plan-milestone") || 
		                sys.includes("research-slice") || sys.includes("plan-slice");
		if (!isMacro) return true;
	}

	// 2. Check for GSD auto-mode dispatch patterns in the user prompt (works even if running before GSD extension)
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

export function createExecutorHintController() {
	return {
		async injectHint(event) {
			if (!isGSDExecution(event)) return;

			const root = getProjectRoot(process.cwd());
			const paths = [
				root ? join(root, "EXECUTOR.md") : null,
				join(GSD_HOME, "agent", "EXECUTOR.md")
			].filter(Boolean);

			for (const p of paths) {
				if (existsSync(p)) {
					try {
						const hint = readFileSync(p, "utf-8").trim();
						if (!hint) continue;
						
						// Using a very distinctive and high-priority marker
						return {
							systemPrompt: (event.systemPrompt ?? "") + 
								`\n\n# CRITICAL: EXECUTOR GUIDANCE\n${hint}\n`
						};
					} catch { /* skip */ }
				}
			}
		}
	};
}
