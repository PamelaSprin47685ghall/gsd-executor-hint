export { LOADED_MESSAGE } from "./constants.js";
export { notify } from "./utils.js";
export { createExecutorHintController } from "./controller.js";

import { createExecutorHintController } from "./controller.js";
import { notify } from "./utils.js";
import { LOADED_MESSAGE } from "./constants.js";

export default function executorHintExtension(pi) {
	const controller = createExecutorHintController(pi);

	pi.on("before_agent_start", async (event, ctx) => {
		const patch = await controller.injectHint(event);
		if (patch) {
			notify(ctx, LOADED_MESSAGE, "info");
		}
		return patch;
	});
}
