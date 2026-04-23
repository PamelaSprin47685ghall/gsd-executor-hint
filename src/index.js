import { createExecutorHintController } from "./controller.js";

export default function executorHint(pi) {
	const controller = createExecutorHintController();

	pi.on("before_agent_start", async (event) => {
		try {
			return await controller.injectHint(event);
		} catch (err) {
			if (typeof pi.log === "function") {
				pi.log(`executor-hint error: ${err.message}`);
			}
		}
	});
}
