/**
 * Flag chained active_subagents polls with no useful work in between.
 * Mirrors the gpt-5.3-codex idle-polling pattern observed in Sentry
 * traces (e.g. trace f86f73 polled active_subagents 16 times in a row
 * after one agent_group spawn).
 *
 * Counter tracks consecutive active_subagents calls. Any other
 * successful non-status tool call resets it.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const POLLING_TOOL = "active_subagents";

export default function (pi: ExtensionAPI) {
	let chainedPolls = 0;

	pi.on("tool_result", async (event) => {
		if (!event.toolName) return;
		if (event.toolName === POLLING_TOOL) {
			chainedPolls += 1;
		} else {
			chainedPolls = 0;
		}
	});

	return {
		on: "tool_execution_end",
		when: () => chainedPolls >= 2,
		message: () =>
			`You have called active_subagents ${chainedPolls} times in a row with no intervening work. Polling is not productive. While subagents run, do one of: (1) continue with an independent task you can finish in parallel, (2) if everything is blocked on the subagents, wait for their completion event rather than chaining polls, (3) if polls are the right answer for genuinely-gated coordination, space them out with at least one unit of useful work between checks. Do not poll as filler.`,
		cooldown: 5,
	};
}
