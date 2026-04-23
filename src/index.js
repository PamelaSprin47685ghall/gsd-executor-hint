import { createExecutorHintController } from "./controller.js";

/**
 * GSD Executor Hint
 * 
 * Injects EXECUTOR.md directly into the final context right before the LLM call.
 * This is the most reliable way to ensure the model receives the hint.
 */
export default function executorHint(pi) {
	const controller = createExecutorHintController();

	// Use 'context' hook: fires for every LLM request and allows 
	// modifying the full message history.
	pi.on("context", async (event) => {
		try {
			return await controller.patchContext(event);
		} catch (err) {
			if (typeof pi.log === "function") {
				pi.log(`executor-hint (context) error: ${err.message}`);
			}
		}
	});
}
