import { createExecutorHintController, isRelevantPhase, loadExecutorHint } from "../src/controller.js";
import { noop, notify } from "../src/utils.js";
import { test, describe, mock, beforeEach } from "node:test";
import assert from "node:assert";

// ─── utils ────────────────────────────────────────────────────────────────────

test("notify: no-ops when ctx is null", () => {
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

describe("isRelevantPhase", () => {
	test("returns true for executing phase", () => {
		const event = { api: { getPhase: () => "executing" } };
		assert.strictEqual(isRelevantPhase(event), true);
	});

	test("returns true for verifying phase", () => {
		const event = { api: { getPhase: () => "verifying" } };
		assert.strictEqual(isRelevantPhase(event), true);
	});

	test("returns true for summarizing phase", () => {
		const event = { api: { getPhase: () => "summarizing" } };
		assert.strictEqual(isRelevantPhase(event), true);
	});

	test("returns false when api.getPhase() is planning", () => {
		const event = { api: { getPhase: () => "planning" } };
		assert.strictEqual(isRelevantPhase(event), false);
	});

	test("returns true via prompt heuristic when getPhase unavailable", () => {
		const event = {
			prompt: "## Inlined Task Plan\ndo the thing",
		};
		assert.strictEqual(isRelevantPhase(event), true);
		
		const event2 = { prompt: "## Verification Evidence\n..." };
		assert.strictEqual(isRelevantPhase(event2), true);

		const event3 = { prompt: "## Task Summary\n..." };
		assert.strictEqual(isRelevantPhase(event3), true);
	});

	test("returns false when prompt does not contain any markers", () => {
		const event = { prompt: "just a normal planning prompt" };
		assert.strictEqual(isRelevantPhase(event), false);
	});
});

describe("loadExecutorHint", { skip: true }, () => {
	// Requires actual file system
});

// ─── controller integration ────────────────────────────────────────────────────

test("injectHint: returns undefined when not in relevant phase", async () => {
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
		prompt: "## Inlined Task Plan",
	});
	assert.strictEqual(result, undefined);
});

// ─── extension integration ─────────────────────────────────────────────────────

describe("extension", () => {
	test("registers before_agent_start listener", async () => {
		const mockOn = mock.fn();
		const mockPi = { on: mockOn };

		const ext = await import("../src/index.js");
		ext.default(mockPi);

		assert.strictEqual(mockOn.mock.calls.length, 1);
		const [eventName, handler] = mockOn.mock.calls[0].arguments;
		assert.strictEqual(eventName, "before_agent_start");
		assert.strictEqual(typeof handler, "function");
	});
});
