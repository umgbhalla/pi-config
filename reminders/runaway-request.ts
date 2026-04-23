/**
 * Flag single LLM turns that stalled for more than 2 minutes.
 *
 * Mirrors the gpt-5.4 runaway-request pattern observed in Sentry traces
 * (p95 = 220s, p99 = 3678s — a 61-minute single-turn hang). Prompt rules
 * cannot prevent a single-span model hang, but the user deserves a
 * visible signal when it happens so they can intervene, switch model,
 * or kill the session.
 *
 * Measures wall-clock duration between turn_start and turn_end. Fires
 * when the *just-completed* turn exceeded the threshold.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const THRESHOLD_MS = 120_000;

export default function (pi: ExtensionAPI) {
	let turnStart = 0;
	let lastTurnMs = 0;
	let fireOnNextEnd = false;

	pi.on("turn_start", async () => {
		turnStart = Date.now();
	});

	pi.on("turn_end", async () => {
		if (turnStart > 0) {
			lastTurnMs = Date.now() - turnStart;
			turnStart = 0;
			fireOnNextEnd = lastTurnMs >= THRESHOLD_MS;
		}
	});

	return {
		on: "turn_end",
		when: () => {
			if (fireOnNextEnd) {
				fireOnNextEnd = false;
				return true;
			}
			return false;
		},
		message: () =>
			`The turn that just ended took ${Math.round(lastTurnMs / 1000)}s end-to-end. Long single turns compound with sequential tool calls to stretch sessions into 30+ minute runs. If you are about to continue: prefer many short turns over one long reasoning pass, take a concrete next step when you have enough to decide, and split speculative analysis across turns so the user can course-correct.`,
		cooldown: 10,
	};
}
