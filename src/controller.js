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
			// Check if we are inside a GSD worktree (.gsd/worktrees/MXXX)
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
 * Filters out macro-planning/research phases.
 */
function isExecuting(event) {
	if (!event) return false;
	const sys = event.systemPrompt ?? "";
	
	// Must have GSD system context
	if (!sys.includes("[SYSTEM CONTEXT — GSD]") && !sys.includes("## GSD - Get Shit Done")) return false;

	// Macro/Discussion phases exclusion
	const macroMarkers = [
		"## UNIT: Milestone Research",
		"## UNIT: Plan Milestone",
		"## UNIT: Research Slice",
		"## UNIT: Plan Slice",
		"## UNIT: Discuss Milestone",
		"## UNIT: Discuss Slice"
	];
	if (macroMarkers.some(m => sys.includes(m))) return false;

	// Positive execution markers
	const execMarkers = [
		"## UNIT: Execute Task",
		"## UNIT: Complete Slice",
		"## UNIT: Complete Milestone",
		"## UNIT: Reassess Roadmap",
		"## UNIT: Validate Milestone",
		"## UNIT: Run UAT",
		"## UNIT: Replan Slice",
		"## UNIT: Refine Slice"
	];
	if (execMarkers.some(m => sys.includes(m))) return true;

	// Heuristic: If it has Task Plan or Verification markers
	if (sys.includes("## Inlined Task Plan") || sys.includes("## Verification Evidence")) return true;

	return false;
}

export function createExecutorHintController() {
	return {
		async injectHint(event) {
			if (!isExecuting(event)) return;

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
						
						return {
							systemPrompt: (event.systemPrompt ?? "") + 
								`\n\n[USER EXECUTOR HINT — MANDATORY]\n${hint}\n`
						};
					} catch { /* skip */ }
				}
			}
		}
	};
}
