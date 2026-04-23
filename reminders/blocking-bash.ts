/**
 * Flag single bash calls that blocked longer than 60 seconds.
 *
 * Mirrors the gpt-5.3-codex blocking-bash pattern observed in Sentry
 * traces (e.g. an 800-second bash span in trace eb6eed). Blocking
 * commands (dev servers, watchers, tails, polls, sleeps, REPLs) belong
 * in a background pane or subagent, with a short bash read to poll
 * state — never in the foreground bash tool.
 *
 * Uses start/end timestamps on tool_execution_start/_end events to
 * measure wall-clock duration per call, since bash tool output does
 * not always carry elapsed time.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const THRESHOLD_MS = 60_000;

export default function (pi: ExtensionAPI) {
	let startedAt = 0;
	let lastDurationMs = 0;
	let fireOnNextEnd = false;

	pi.on("tool_execution_start", async (event: any) => {
		if (event?.toolName === "bash") {
			startedAt = Date.now();
		}
	});

	pi.on("tool_execution_end", async (event: any) => {
		if (event?.toolName === "bash" && startedAt > 0) {
			lastDurationMs = Date.now() - startedAt;
			startedAt = 0;
			fireOnNextEnd = lastDurationMs >= THRESHOLD_MS;
		}
	});

	return {
		on: "tool_execution_end",
		when: () => {
			if (fireOnNextEnd) {
				fireOnNextEnd = false;
				return true;
			}
			return false;
		},
		message: () =>
			`A single bash call just blocked for ${Math.round(lastDurationMs / 1000)}s. Blocking commands should not run through the foreground bash tool. If this was a dev server, watcher, tail, long-running test runner, package install, or interactive REPL: move it to a background pane, a subagent, or an explicitly-managed long-running process, and poll state with short bash reads. Keep foreground bash calls under ~10s whenever possible.`,
		cooldown: 5,
	};
}
