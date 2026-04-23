import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

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
 * GSD Executor Hint - Final Pure Version
 * 
 * Strategy:
 * 1. Hook into 'session_start' (fires once when a new unit or session begins).
 * 2. Directly send a custom message to the conversation history.
 */
export default function executorHint(pi) {
	pi.on("session_start", async () => {
		try {
			const hint = loadHint();
			if (!hint) return;

			// Directly inject the hint as a visible user message at the start of the session.
			// This matches: "send one user message after system prompt, don't add later".
			pi.sendMessage({
				customType: "gsd-executor-hint",
				content: `[MANDATORY EXECUTOR GUIDANCE]\n${hint}`,
				display: true
			}, { triggerTurn: false });
			
			if (typeof pi.log === "function") {
				pi.log("Executor Hint injected into session start.");
			}
		} catch (err) {
			console.error(`[executor-hint] Error: ${err.message}`);
		}
	});
}
