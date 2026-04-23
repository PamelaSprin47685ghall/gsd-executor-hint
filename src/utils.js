/**
 * Notify the GSD UI.
 * @param {object|null} ctx - GSD context
 * @param {string} message - Notification message
 * @param {"info"|"warn"|"error"} [level="info"] - Notification level
 */
export function notify(ctx, message, level = "info") {
	ctx?.ui?.notify?.(message, level);
}

/**
 * Trivial identity function for chaining. Used when a hook wants to
 * return `undefined` explicitly rather than implicitly.
 * @param {*} x
 * @returns {*}
 */
export const noop = (x) => x;
