/**
 * Flag when the same tool has been called many times in a row.
 * Mirrors the Opus "consecutive same-tool thrashing" pattern observed in
 * Sentry agent traces (e.g. 31x hyperpi_ssh, 26x bash, 12x read in a row)
 * where the model plans one step, observes one result, re-plans one step,
 * never batching or switching tactics.
 *
 * Triggers on runs of many identical tool names regardless of args, because
 * even same-tool-different-args at high counts is itself the symptom.
 * Thresholds: bash=50, edit=50, read=10, all others=10.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let lastTool = "";
	let streak = 0;

	pi.on("tool_result", async (event) => {
		if (!event.toolName) return;
		if (event.toolName === lastTool) {
			streak += 1;
		} else {
			lastTool = event.toolName;
			streak = 1;
		}
	});

	const thresholds: Record<string, number> = {
		bash: 50,
		edit: 50,
		read: 50,
	};
	const defaultThreshold = 30;

	return {
		on: "tool_execution_end",
		when: () => streak >= (thresholds[lastTool] ?? defaultThreshold),
		message: () =>
			`You have called '${lastTool}' ${streak} times in a row. This is the single strongest signal you are stuck in a tool-thrashing loop. Before calling '${lastTool}' again: (1) summarize in one sentence what you have learned from the prior calls, (2) batch the next 3–5 calls into a single invocation if they are independent, OR (3) switch tools, OR (4) state the next distinct step and stop calling '${lastTool}' until you have.`,
		cooldown: 5,
	};
}
