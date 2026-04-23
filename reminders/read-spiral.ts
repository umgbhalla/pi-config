/**
 * Flag read-heavy stretches without any produced output, and suggest the
 * three legitimate ways forward.
 *
 * Mirrors the Opus "read-spiral" pattern observed in Sentry traces (e.g.
 * 41 reads / 1 write over 1435s, 39 reads / 1 write over 1235s). But
 * many reads is not inherently a spiral — codebase exploration is a real
 * workload. The reminder presents three options rather than demanding a
 * premature commit, with parallel subagent fan-out as the preferred
 * choice when the task really is broad exploration.
 *
 * Counter is reads-since-last-produced-output. Any edit, write,
 * write_artifact, agent_group, branch, or subagent success resets it.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PRODUCER_TOOLS = new Set([
	"edit",
	"write",
	"write_artifact",
	"agent_group",
	"branch",
	"subagent",
]);

export default function (pi: ExtensionAPI) {
	let readsSinceOutput = 0;

	pi.on("tool_result", async (event) => {
		if (!event.toolName) return;
		if (event.toolName === "read" && !event.isError) {
			readsSinceOutput += 1;
		} else if (PRODUCER_TOOLS.has(event.toolName) && !event.isError) {
			readsSinceOutput = 0;
		}
	});

	return {
		on: "tool_execution_end",
		when: () => readsSinceOutput >= 20,
		message: () =>
			`You have done ${readsSinceOutput} sequential reads without producing an edit, write, answer, or subagent launch. Pick ONE of these three, then act:\n\n` +
			`  1. If the task is broad codebase exploration (learning a new repo, mapping a feature, auditing many files): stop reading serially and launch a subagent swarm. Use agent_group or branch with partitioned file sets so 3–5 subagents explore in parallel and return structured findings. Serial reads are the wrong tool for exploration at this scale.\n` +
			`  2. If you have enough context for the change: commit to the edit/write/answer now.\n` +
			`  3. If you genuinely need more context but the task is narrow: write a one-paragraph plan naming the exact files, functions, and next tool calls — then execute that plan.\n\n` +
			`Do not keep reading one more file "just to be sure". If you pick option 1, give each subagent a narrow deliverable, a step/time budget, and the expected output format (per the Opus subagent_contract).`,
		cooldown: 30,
	};
}
