import { createExecutorHintController } from "./controller.js";

/**
 * GSD Executor Hint
 * 
 * Injects EXECUTOR.md into GSD autonomous execution turns.
 */
export default function executorHint(pi) {
	const controller = createExecutorHintController();

	pi.on("before_agent_start", async (event) => {
		try {
			const patch = await controller.injectHint(event);
			if (patch && typeof pi.log === "function") {
				pi.log("GSD Executor Hint injected.");
			}
			return patch;
		} catch (err) {
			if (typeof pi.log === "function") {
				pi.log(`executor-hint error: ${err.message}`);
			}
		}
	});
}
