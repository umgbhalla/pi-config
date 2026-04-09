import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const PENDING_TYPE = "reload-and-resume-pending";
const CONSUMED_TYPE = "reload-and-resume-consumed";
const MAX_PENDING_AGE_MS = 15 * 60 * 1000;

interface PendingReloadRequest {
  id?: string;
  sessionId?: string;
  sessionFile?: string | null;
  instruction?: string;
  createdAt?: number;
}

function createResumeMessage(instruction?: string): string {
  return [
    "Runtime reload complete.",
    "Continue in this same session from the current conversation state.",
    instruction?.trim() ? `Additional instruction: ${instruction.trim()}` : undefined,
  ].filter(Boolean).join("\n\n");
}

function getLatestPendingRequest(entries: Array<any>, sessionId: string, sessionFile?: string): PendingReloadRequest | null {
  const consumed = new Set(
    entries
      .filter((entry) => entry.type === "custom" && entry.customType === CONSUMED_TYPE)
      .map((entry) => entry.data?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type !== "custom" || entry.customType !== PENDING_TYPE) continue;

    const data = (entry.data ?? {}) as PendingReloadRequest;
    if (!data.id || consumed.has(data.id)) continue;
    if (data.sessionId && data.sessionId !== sessionId) continue;
    if (data.sessionFile && sessionFile && data.sessionFile !== sessionFile) continue;
    if (typeof data.createdAt === "number" && Date.now() - data.createdAt > MAX_PENDING_AGE_MS) continue;

    return data;
  }

  return null;
}

export default function reloadAndResumeExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    if (event.reason !== "reload") return;

    const sessionId = ctx.sessionManager.getSessionId();
    const sessionFile = ctx.sessionManager.getSessionFile() ?? undefined;
    const pending = getLatestPendingRequest(ctx.sessionManager.getEntries(), sessionId, sessionFile);
    if (!pending?.id) return;

    pi.appendEntry(CONSUMED_TYPE, {
      id: pending.id,
      consumedAt: Date.now(),
      sessionId,
    });

    const resumeMessage = createResumeMessage(pending.instruction);
    setTimeout(() => {
      void pi.sendUserMessage(resumeMessage);
    }, 0);
  });

  pi.registerTool({
    name: "reload_and_resume_runtime",
    label: "Reload And Resume Runtime",
    description: "Arm an automatic same-session continuation for the next manual /reload.",
    promptSnippet: "Prepare an automatic continuation that will fire after the user manually runs /reload in this same session.",
    promptGuidelines: [
      "Use this when runtime config, extensions, skills, or prompts changed and you want the same session to keep going after a manual /reload.",
      "Current pi extensions cannot execute builtin slash commands like /reload from a tool call, so this tool only arms the resume step.",
      "After the user manually runs /reload, the session resumes in a new turn in the same session; it does not resume the original tool call as a delayed toolResult.",
    ],
    parameters: Type.Object({
      instruction: Type.Optional(Type.String({
        description: "Optional extra instruction to inject after reload, e.g. 'Retry the previous step now that the extension is loaded.'",
      })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sessionId = ctx.sessionManager.getSessionId();
      const sessionFile = ctx.sessionManager.getSessionFile() ?? null;
      const instruction = params.instruction?.trim();

      pi.appendEntry(PENDING_TYPE, {
        id: requestId,
        sessionId,
        sessionFile,
        instruction,
        createdAt: Date.now(),
      });

      return {
        content: [{
          type: "text",
          text: instruction
            ? `Armed automatic continuation for the next manual /reload in this session. After you run /reload, I will continue with: ${instruction}`
            : "Armed automatic continuation for the next manual /reload in this session. After you run /reload, I will automatically continue in the same session.",
        }],
        details: {
          requestId,
          sessionId,
          requiresManualReload: true,
          willResumeInSameSession: true,
          instruction,
        },
      };
    },
  });
}
