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
 * GSD Executor Hint - Final Final Version
 */
export default function executorHint(pi) {
	const inject = async (context) => {
		try {
			const hint = loadHint();
			if (!hint) return;

			// Send visible user message at the very start of ANY session
			pi.sendMessage({
				customType: "gsd-executor-hint",
				content: `[MANDATORY EXECUTOR GUIDANCE]\n${hint}`,
				display: true
			}, { triggerTurn: false });
			
			if (typeof pi.log === "function") {
				pi.log(`Executor Hint injected (${context}).`);
			}
		} catch (err) {
			console.error(`[executor-hint] ${context} error: ${err.message}`);
		}
	};

	// 1. Initial process start (Interactive startup or Subagent process)
	pi.on("session_start", () => inject("session_start"));

	// 2. GSD Auto Mode unit transitions (New unit = New session in same process)
	pi.on("session_switch", (event) => {
		if (event.reason === "new") {
			inject("session_switch:new");
		}
	});
}
