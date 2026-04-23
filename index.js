import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

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

/**
 * GSD System Prompt Alway-On (v2.0.0)
 * 
 * Simple: Reads SYSTEM.md and appends it to the system prompt for every turn.
 */
export default function(pi) {
	pi.on("before_agent_start", async (event) => {
		try {
			const root = process.env.GSD_PROJECT_ROOT ?? findProjectRoot(process.cwd());
			const paths = [
				root ? join(root, "SYSTEM.md") : null,
				join(GSD_HOME, "agent", "SYSTEM.md")
			].filter(Boolean);

			for (const p of paths) {
				if (existsSync(p)) {
					const content = readFileSync(p, "utf-8").trim();
					if (content) {
						return {
							systemPrompt: (event.systemPrompt ?? "") + `\n\n${content}\n`
						};
					}
				}
			}
		} catch (err) {
			// Silent fail
		}
	});
}
