import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

function findRealProjectRoot(cwd) {
	let curr = resolve(cwd);
	while (curr !== resolve(curr, "..")) {
		// 识别标准的 .gsd 目录。注意：如果我们在 worktree 里，.gsd 可能是一个文件（git-link）或目录
		if (existsSync(join(curr, ".gsd"))) {
			// 如果当前路径包含 worktrees，说明我们在子分支，真正的 EXECUTOR.md 在三层级以上
			if (curr.includes(join(".gsd", "worktrees"))) {
				return resolve(curr, "..", "..", "..");
			}
			return curr;
		}
		curr = resolve(curr, "..");
	}
	return null;
}

function isGSDExecution(event) {
	if (!event) return false;
	
	// 优先信任 API 状态
	const phase = event.api?.getPhase?.() ?? event.context?.phase;
	if (phase) return ["executing", "verifying", "summarizing"].includes(phase);

	// 降级使用特征匹配：必须包含 GSD 核心标记，且不处于研究/规划阶段
	const sys = (event.systemPrompt ?? "").toLowerCase();
	const isGSD = sys.includes("gsd") || sys.includes("get shit done");
	const isMacroPhase = sys.includes("research-milestone") || sys.includes("plan-slice");
	
	return isGSD && !isMacroPhase;
}

export function createExecutorHintController() {
	return {
		async injectHint(event) {
			if (!isGSDExecution(event)) return;

			// 找到真正的项目根目录，解决 Worktree 找不到非 track 文件的问题
			const root = process.env.GSD_PROJECT_ROOT ?? findRealProjectRoot(process.cwd());
			const paths = [
				root ? join(root, "EXECUTOR.md") : null,
				join(GSD_HOME, "agent", "EXECUTOR.md")
			].filter(Boolean);

			for (const p of paths) {
				if (existsSync(p)) {
					try {
						const hint = readFileSync(p, "utf-8").trim();
						if (!hint) continue;
						
						// 注入到 System Prompt 的末尾，并增加明确的视觉分隔
						return {
							systemPrompt: (event.systemPrompt ?? "") + 
								`\n\n[USER EXECUTOR HINT — ACTIVE]\n${hint}\n`
						};
					} catch { /* skip */ }
				}
			}
		}
	};
}
