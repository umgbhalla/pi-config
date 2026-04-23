/**
 * Remind the agent to compact when context gets large.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (_pi: ExtensionAPI) {
	return {
		on: "turn_start",
		when: ({ ctx }) => (ctx.getContextUsage()?.tokens ?? 0) > 550_000,
		message: ({ ctx }) => {
			const tokens = ctx.getContextUsage()?.tokens ?? 0;
			return `Context is at ${Math.round(tokens / 1000)}k tokens (>550k). Consider compacting to maintain quality.`;
		},
		once: true,
	};
}
