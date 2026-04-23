import { createExecutorHintController } from "./controller.js";

const seenSessions = new Set();

/**
 * GSD Executor Hint
 */
export default function executorHint(pi) {
	const controller = createExecutorHintController();

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager.getSessionId();
			
			// Only inject once per session to avoid repetition
			if (seenSessions.has(sessionId)) return;

			const result = await controller.getHintMessage(event);
			
			if (result) {
				seenSessions.add(sessionId);
				if (typeof pi.log === "function") {
					pi.log(`[executor-hint] Injected for session ${sessionId}`);
				}
			}
			return result;
		} catch (err) {
			console.error(`[executor-hint] Critical error: ${err.message}`);
		}
	});
}
