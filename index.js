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
 * Audit GSD 2.0 system prompts for precise phase detection.
 */
function isExecutionTurn(event) {
	if (!event) return false;
	const sys = event.systemPrompt ?? "";
	const usr = (event.prompt ?? "").toLowerCase();

	// --- 1. POSITIVE MATCHES (Execution/Verification/Completion) ---
	
	// Exact headers from GSD 2.0 templates
	const execHeaders = [
		"## UNIT: Execute Task",
		"## UNIT: Complete Slice",
		"## UNIT: Complete Milestone",
		"## UNIT: Validate Milestone",
		"## UNIT: Run UAT",
		"# Reactive Task Execution"
	];
	if (execHeaders.some(h => sys.includes(h))) return true;

	// User prompt patterns for subagents or direct dispatch
	if (usr.includes("execute the next task") || 
	    usr.includes("summarize the completed work") ||
	    usr.includes("run uat") ||
	    usr.includes("verify the milestone")) {
		return true;
	}

	// --- 2. NEGATIVE MATCHES (Planning/Research/Discussion) ---
	
	const planHeaders = [
		"## UNIT: Plan Milestone",
		"## UNIT: Plan Slice",
		"## UNIT: Research Milestone",
		"## UNIT: Research Slice",
		"## UNIT: Discuss Milestone",
		"## UNIT: Discuss Slice",
		"## UNIT: Reassess Roadmap",
		"## UNIT: Replan Slice",
		"## UNIT: Refine Slice"
	];
	if (planHeaders.some(h => sys.includes(h))) return false;

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
			} catch { /* ignore */ }
		}
	}
	return null;
}

/**
 * GSD Executor Hint - Production Precision Version
 */
export default function executorHint(pi) {
	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// Inject only once per session to fulfill "send one message at start"
			if (seenSessions.has(sessionId)) return;

			if (isExecutionTurn(event)) {
				const hint = loadHint();
				if (!hint) return;

				seenSessions.add(sessionId);
				
				if (typeof pi.log === "function") {
					pi.log(`[executor-hint] Injected for unit ${sessionId}`);
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
			console.error(`[executor-hint] Critical error: ${err.message}`);
		}
	});
}
