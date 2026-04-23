import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");
const seenSessions = new Set();

function findProjectRoot(cwd) {
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

function loadHint() {
	const root = process.env.GSD_PROJECT_ROOT ?? findProjectRoot(process.cwd());
	const paths = [
		root ? join(root, "SYSTEM.md") : null,
		join(GSD_HOME, "agent", "SYSTEM.md")
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
 * GSD System Prompt Injection (v2.2.0)
 * 
 * Strategy:
 * Inject SYSTEM.md as the absolute FIRST user message of every session.
 * This ensures high visibility, session-wide persistence, and 100% reliability.
 */
export default function(pi) {
	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// Only once per session (first turn)
			if (seenSessions.has(sessionId)) return;

			const hint = loadHint();
			if (hint) {
				seenSessions.add(sessionId);

				if (typeof pi.log === "function") {
					pi.log(`SYSTEM.md injected as first message for ${sessionId}`);
				}

				return {
					message: {
						customType: "gsd-system-hint",
						content: `[SYSTEM.md — INITIAL GUIDANCE]\n${hint}`,
						display: true 
					}
				};
			}
		} catch (err) {
			// Silent fail
		}
	});
}
