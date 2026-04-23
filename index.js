import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");
const seenSessions = new Set();

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
 * Strict execution phase detection.
 * Targets only implementation/completion units, ignoring planning/research.
 */
function isExecuting(event) {
	if (!event) return false;
	
	const sys = (event.systemPrompt ?? "").toLowerCase();
	const usr = (event.prompt ?? "").toLowerCase();

	// 1. Explicit GSD unit patterns in user instruction (Highest reliability)
	const execPatterns = [
		"execute the next task",
		"resume interrupted work",
		"summarize the completed work",
		"verify the milestone",
		"run uat",
		"reassess the roadmap",
		"replan the slice",
		"evaluate quality gates"
	];
	if (execPatterns.some(p => usr.includes(p))) return true;

	// 2. System prompt check (Fallback for some subagent flows)
	if (sys.includes("[system context — gsd]") || sys.includes("## gsd - get shit done")) {
		// Mandatory exclusions: planning and research phases are NOT execution
		const macroMarkers = [
			"research-milestone", "plan-milestone", 
			"research-slice", "plan-slice",
			"discuss-milestone", "discuss-slice"
		];
		if (macroMarkers.some(m => sys.includes(m))) return false;

		// Positive execution signals in system prompt
		const execMarkers = ["execute task", "complete slice", "validate milestone", "run uat"];
		if (execMarkers.some(m => sys.includes(m))) return true;
	}

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

/**
 * GSD Executor Hint - Precise Injection Version
 */
export default function executorHint(pi) {
	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// Fulfills: "send one user message at the start, don't add later"
			if (seenSessions.has(sessionId)) return;

			if (isExecuting(event)) {
				const hint = loadHint();
				if (!hint) return;

				seenSessions.add(sessionId);
				
				if (typeof pi.log === "function") {
					pi.log(`Executor Hint injected for session ${sessionId}`);
				}

				return {
					message: {
						customType: "gsd-executor-hint",
						content: `[MANDATORY EXECUTOR GUIDANCE]\n${hint}`,
						display: true 
					}
				};
			}
		} catch (err) {
			console.error(`[executor-hint] Hook error: ${err.message}`);
		}
	});
}
