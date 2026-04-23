import { createExecutorHintController } from "./controller.js";

const seenSessions = new Set();

/**
 * GSD Executor Hint - Brute Force Debug Version
 */
export default function executorHint(pi) {
	// Force a log on load
	if (typeof pi.log === "function") pi.log("Executor-Hint extension loaded.");

	const controller = createExecutorHintController();

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// DEBUG: console.error shows up in terminal
			// console.error(`[executor-hint] Fired for session: ${sessionId}`);

			if (seenSessions.has(sessionId)) return;

			const result = await controller.getHintMessage(event);
			
			if (result) {
				seenSessions.add(sessionId);
				if (typeof pi.log === "function") {
					pi.log(`[executor-hint] Injected for session ${sessionId}`);
				}
				
				// Return both to be safe
				return {
					...result,
					systemPrompt: (event.systemPrompt ?? "") + "\n\n[EXECUTOR HINT ACTIVE]\n"
				};
			}
		} catch (err) {
			console.error(`[executor-hint] Error in hook: ${err.message}`);
		}
	});
}
