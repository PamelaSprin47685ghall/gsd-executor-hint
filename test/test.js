import { createExecutorHintController, isExecutingPhase, loadExecutorHint } from "../src/controller.js";
import { noop, notify } from "../src/utils.js";
import { test, describe, mock, beforeEach } from "node:test";
import assert from "node:assert";

// ─── utils ────────────────────────────────────────────────────────────────────

test("notify: no-ops when ctx is null", () => {
	// Should not throw
	notify(null, "msg");
	notify(undefined, "msg");
});

test("notify: calls ctx.ui.notify when available", () => {
	let called = false;
	const ctx = {
		ui: {
			notify(msg, level) {
				called = true;
				assert.strictEqual(msg, "hello");
				assert.strictEqual(level, "warn");
			},
		},
	};
	notify(ctx, "hello", "warn");
	assert.ok(called);
});

test("noop: returns its argument unchanged", () => {
	assert.strictEqual(noop(42), 42);
	assert.strictEqual(noop("foo"), "foo");
	assert.strictEqual(noop(null), null);
});

// ─── controller.unit ───────────────────────────────────────────────────────────

describe("isExecutingPhase", () => {
	test("returns true when api.getPhase() === 'executing'", () => {
		const event = { api: { getPhase: () => "executing" } };
		assert.strictEqual(isExecutingPhase(event), true);
	});

	test("returns false when api.getPhase() === 'planning'", () => {
		const event = { api: { getPhase: () => "planning" } };
		assert.strictEqual(isExecutingPhase(event), false);
	});

	test("returns false when api.getPhase() is missing", () => {
		const event = {};
		assert.strictEqual(isExecutingPhase(event), false);
	});

	test("returns true via prompt heuristic when getPhase unavailable", () => {
		const event = {
			prompt:
				"some context\n## Inlined Task Plan (authoritative local execution contract)\ndo the thing",
		};
		assert.strictEqual(isExecutingPhase(event), true);
	});

	test("returns false when prompt does not contain the marker", () => {
		const event = { prompt: "just a normal planning prompt" };
		assert.strictEqual(isExecutingPhase(event), false);
	});
});

describe("loadExecutorHint", { skip: true }, () => {
	// Requires actual file system — skip in CI. Enable with a real temp file setup.
});

// ─── controller integration ────────────────────────────────────────────────────

test("injectHint: returns undefined when not in executing phase", async () => {
	const pi = { on: mock.fn() };
	const ctrl = createExecutorHintController(pi);

	const result = await ctrl.injectHint({ api: { getPhase: () => "planning" } });
	assert.strictEqual(result, undefined);
});

test("injectHint: returns undefined when no EXECUTOR.md found", async () => {
	const pi = { on: mock.fn() };
	const ctrl = createExecutorHintController(pi);

	const result = await ctrl.injectHint({
		api: { getPhase: () => "executing" },
		prompt: "## Inlined Task Plan (authoritative local execution contract)",
	});
	assert.strictEqual(result, undefined);
});

test("injectHint: injects hint when in executing phase and EXECUTOR.md exists", async () => {
	// This test requires a real EXECUTOR.md in the repo root or temp dir.
	// Covered by manual / e2e verification.
});

// ─── extension integration ─────────────────────────────────────────────────────

describe("extension", () => {
	test("registers before_agent_start listener", async () => {
		const mockOn = mock.fn();
		const mockPi = { on: mockOn };

		// Import the default export (dynamic import for ESM)
		const ext = await import("../src/index.js");
		ext.default(mockPi);

		assert.strictEqual(mockOn.mock.calls.length, 1);
		const [eventName, handler] = mockOn.mock.calls[0].arguments;
		assert.strictEqual(eventName, "before_agent_start");
		assert.strictEqual(typeof handler, "function");
	});
});
