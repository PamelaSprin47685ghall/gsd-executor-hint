import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

function findProjectRoot(cwd) {
	let curr = resolve(cwd);
	while (curr !== resolve(curr, "..")) {
		if (existsSync(join(curr, ".gsd"))) return curr;
		curr = resolve(curr, "..");
	}
	return null;
}

function isExecuting(event) {
	if (!event) return false;
	const phase = event.api?.getPhase?.() ?? event.context?.phase;
	if (phase) return ["executing", "verifying", "summarizing"].includes(phase);

	const sys = event.systemPrompt ?? "";
	const usr = event.prompt ?? "";
	return (sys.includes("## Inlined Task Plan") || usr.includes("## Verification Evidence")) &&
	       !sys.includes("## Milestone Research") && !sys.includes("## Slice Plan");
}

export function createExecutorHintController() {
	return {
		async injectHint(event) {
			if (!isExecuting(event)) return;

			const root = process.env.GSD_PROJECT_ROOT ?? findProjectRoot(process.cwd());
			const paths = [
				root ? join(root, "EXECUTOR.md") : null,
				join(GSD_HOME, "agent", "EXECUTOR.md")
			].filter(Boolean);

			for (const p of paths) {
				if (existsSync(p)) {
					const hint = readFileSync(p, "utf-8").trim();
					if (hint) return { systemPrompt: (event.systemPrompt ?? "") + `\n\n[EXECUTOR HINT]\n${hint}\n` };
				}
			}
		}
	};
}
