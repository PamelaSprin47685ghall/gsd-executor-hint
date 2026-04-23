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
 * Robust phase detection based on the ACTUAL instruction text (event.prompt).
 */
function isExecutionTurn(event) {
	if (!event) return false;
	const sys = (event.systemPrompt ?? "").toLowerCase();
	const usr = (event.prompt ?? "").toLowerCase();

	// 1. Project check
	const isGSD = sys.includes("gsd") || sys.includes("get shit done");
	if (!isGSD) return false;

	// 2. Strict Phasing
	// Exclusion list: Planning/Research/Discussion is NEVER execution.
	const planningMarkers = ["plan milestone", "plan slice", "research milestone", "research slice", "discuss milestone", "discuss slice", "refine slice"];
	if (planningMarkers.some(m => usr.includes(m))) return false;

	// Inclusion list: Direct execution/completion/verification units.
	// Matches GSD 2.0 template headers.
	const execMarkers = ["execute task", "complete slice", "complete milestone", "validate milestone", "run uat", "reactive task execution", "replan slice"];
	if (execMarkers.some(m => usr.includes(m))) return true;

	// 3. Interactive fallback
	// If user says "execute task T01" in interactive mode.
	if (usr.includes("execute") && usr.includes("task")) return true;

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
 * GSD Executor Hint - Precise Turn Injection
 */
export default function executorHint(pi) {
	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// Only once per session (first turn of the unit)
			if (seenSessions.has(sessionId)) return;

			if (isExecutionTurn(event)) {
				const hint = loadHint();
				if (!hint) return;

				seenSessions.add(sessionId);
				
				if (typeof pi.log === "function") {
					pi.log(`[executor-hint] Injected for session ${sessionId}`);
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
			console.error(`[executor-hint] Error: ${err.message}`);
		}
	});
}
