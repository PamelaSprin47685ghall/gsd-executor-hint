import { createExecutorHintController } from "./controller.js";

/**
 * GSD Executor Hint
 * 
 * Logic:
 * 1. Listen for 'before_agent_start'.
 * 2. If it's the first turn of a GSD execution session, inject one user message.
 * 3. No system prompt modifications, no repeated injections.
 */
export default function executorHint(pi) {
	const controller = createExecutorHintController();

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			// Check if we've already added entries to this session
			// (Fulfills: "send one user message at the start, don't add later")
			const entries = ctx.sessionManager.getEntries();
			if (entries && entries.length > 0) return;

			const result = await controller.getHintMessage(event);
			if (result && typeof pi.log === "function") {
				pi.log("GSD Executor Hint injected as initial message.");
			}
			return result;
		} catch (err) {
			if (typeof pi.log === "function") {
				pi.log(`executor-hint error: ${err.message}`);
			}
		}
	});
}
