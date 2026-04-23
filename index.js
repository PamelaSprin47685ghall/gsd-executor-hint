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
 * GSD System Prompt Injection (v2.3.0)
 * 
 * Logic:
 * 1. Listen for session_start and session_switch (most reliable for GSD sessions).
 * 2. Send SYSTEM.md as the first user message.
 */
export default function(pi) {
	const inject = async (sessionId) => {
		if (!sessionId || seenSessions.has(sessionId)) return;

		const hint = loadHint();
		if (!hint) return;

		seenSessions.add(sessionId);

		// Triggered at the absolute start of the session.
		// This puts the message at the top of history.
		pi.sendMessage({
			customType: "gsd-system-hint",
			content: `[SYSTEM.md — INITIAL GUIDANCE]\n${hint}`,
			display: true 
		}, { triggerTurn: false });

		if (typeof pi.log === "function") {
			pi.log(`SYSTEM.md injected for session ${sessionId}`);
		}
	};

	pi.on("session_start", async (event, ctx) => {
		await inject(ctx.sessionManager.getSessionId());
	});

	pi.on("session_switch", async (event, ctx) => {
		if (event.reason === "new") {
			await inject(ctx.sessionManager.getSessionId());
		}
	});
}
