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

/**
 * BRUTE FORCE: Just check if we are in a GSD project.
 */
function isGSDProject() {
	return getProjectRoot(process.cwd()) !== null;
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
		async getHintMessage() {
			if (!isGSDProject()) return;

			const hint = loadHint();
			if (!hint) return;

			return {
				message: {
					customType: "gsd-executor-hint",
					content: `[MANDATORY EXECUTOR GUIDANCE]\n${hint}`,
					display: true 
				}
			};
		}
	};
}
