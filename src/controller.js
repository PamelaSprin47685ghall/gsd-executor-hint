import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const GSD_HOME = process.env.GSD_HOME ?? join(homedir(), ".gsd");

/**
 * Locate the real project root.
 * Handles GSD worktrees by回溯 to the parent project directory.
 */
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
 * Specifically check for task-level execution prompts.
 */
function isTaskExecutionMessage(text) {
	if (!text || typeof text !== "string") return false;
	const t = text.toLowerCase();
	return t.includes("execute the next task") || 
	       t.includes("task: execute the next task") ||
	       t.includes("resume interrupted work") ||
	       t.includes("run uat") ||
	       t.includes("summarize the completed work");
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
		/**
		 * The Ultimate Fix: Hook into the 'context' event.
		 * This fires right before the LLM call and allows mutating the full message history.
		 */
		async patchContext(event) {
			const messages = event.messages;
			if (!Array.isArray(messages) || messages.length === 0) return;

			// 1. Detect if this is a GSD execution turn
			// We look for the GSD task instruction in the messages
			let isGSDTurn = false;
			let lastUserMsgIdx = -1;

			for (let i = messages.length - 1; i >= 0; i--) {
				const msg = messages[i];
				if (msg.role === "user") {
					if (lastUserMsgIdx === -1) lastUserMsgIdx = i;
					
					// GSD task prompts are distinctive
					const content = Array.isArray(msg.content) ? msg.content[0]?.text : msg.content;
					if (isTaskExecutionMessage(content)) {
						isGSDTurn = true;
						break;
					}
				}
			}

			if (!isGSDTurn || lastUserMsgIdx === -1) return;

			// 2. Load the hint
			const hint = loadHint();
			if (!hint) return;

			// 3. Inject hint into the LAST user message for maximum attention
			// We clone the message to avoid side effects
			const newMessages = [...messages];
			const lastMsg = { ...newMessages[lastUserMsgIdx] };
			
			const hintBlock = `\n\n[MANDATORY EXECUTOR HINT]\n${hint}\n`;

			if (Array.isArray(lastMsg.content)) {
				const textPart = lastMsg.content.find(c => c.type === "text");
				if (textPart) {
					textPart.text += hintBlock;
				} else {
					lastMsg.content.push({ type: "text", text: hintBlock });
				}
			} else {
				lastMsg.content = (lastMsg.content ?? "") + hintBlock;
			}

			newMessages[lastUserMsgIdx] = lastMsg;
			return { messages: newMessages };
		}
	};
}
