/**
 * Idle Nudge — Detects when an autonomous subagent goes idle without
 * writing an artifact, and nudges it to wrap up after 10 seconds.
 *
 * The problem: subagents sometimes finish their work (produce text output,
 * no more tool calls) but forget to call write_artifact, which is what
 * signals completion. This extension watches for idle state and sends a
 * follow-up message prompting the agent to write its artifact and finish.
 *
 * Only activates for non-interactive (autonomous) sessions — never nudges
 * when a human is present.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const IDLE_NUDGE_DELAY_MS = 10_000; // 10 seconds

export default function (pi: ExtensionAPI) {
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let hasWrittenArtifact = false;
  let isAutonomous = false;
  let sessionCtx: any = null;
  let nudgeCount = 0;
  const MAX_NUDGES = 2;

  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function startIdleTimer() {
    clearIdleTimer();

    // Don't nudge interactive sessions or if artifact already written
    if (!isAutonomous || hasWrittenArtifact || nudgeCount >= MAX_NUDGES) return;
    if (!sessionCtx) return;

    idleTimer = setTimeout(() => {
      idleTimer = null;

      // Double-check we're still idle
      if (!sessionCtx || !sessionCtx.isIdle() || hasWrittenArtifact) return;

      nudgeCount++;
      pi.sendUserMessage(
        "[Idle Nudge] You appear to be done but haven't written your artifact yet. " +
          "Please call `write_artifact` with your findings/results now, then finish up. " +
          "If you've already written it, call `subagent_done` to exit cleanly.",
        { deliverAs: "followUp" }
      );
    }, IDLE_NUDGE_DELAY_MS);
  }

  // Detect autonomous mode: no UI = non-interactive subagent
  pi.on("session_start", async (_event, ctx) => {
    sessionCtx = ctx;
    isAutonomous = !ctx.hasUI;
    hasWrittenArtifact = false;
    nudgeCount = 0;
    clearIdleTimer();
  });

  pi.on("session_shutdown", async () => {
    clearIdleTimer();
    sessionCtx = null;
  });

  // Track artifact writes — once written, no more nudges needed
  pi.on("tool_execution_end", async (event, _ctx) => {
    if (
      event.toolName === "write_artifact" ||
      event.toolName === "subagent_done"
    ) {
      hasWrittenArtifact = true;
      clearIdleTimer();
    }
  });

  // Any tool activity or agent activity = not idle, reset timer
  pi.on("tool_execution_start", async () => {
    clearIdleTimer();
  });

  pi.on("agent_start", async () => {
    clearIdleTimer();
  });

  pi.on("turn_end", async () => {
    clearIdleTimer();
  });

  pi.on("message_end", async () => {
    clearIdleTimer();
  });

  // agent_end = the agent loop finished (model returned text, no tool calls).
  // This is the "idle" moment. Start the countdown.
  pi.on("agent_end", async (_event, ctx) => {
    sessionCtx = ctx;
    startIdleTimer();
  });
}
