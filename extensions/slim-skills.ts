import { homedir } from "node:os";
import { basename, dirname, relative } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type SkillCommand = {
  name: string;
  description?: string;
  source: string;
  sourceInfo?: {
    path?: string;
    scope?: string;
    origin?: string;
  };
};

type SkillEntry = {
  name: string;
  hint: string;
  pathHint: string;
};

const START_TAG = "<available_skills>";
const END_TAG = "</available_skills>";
const INTRO_LINES = [
  "Skills provide specialized instructions for specific tasks.",
  "Use the read tool to load a skill's file when the task matches its description.",
  "Project-local skills live at .pi/skills/<name>/SKILL.md. Global skills live at ~/.agents/skills/<name>/SKILL.md.",
  "Prefer the project-local skill when both exist. When a skill file references a relative path, resolve it against the skill directory.",
];

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function normalizeText(text?: string) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function getSkillName(path: string, fallbackName: string) {
  const fileName = basename(path);
  if (fileName === "SKILL.md") return basename(dirname(path));
  if (fileName.endsWith(".md")) return fileName.slice(0, -3);
  return fallbackName.replace(/^skill:/, "");
}

function getPathHint(skillFile: string, name: string, cwd: string) {
  const normalizedPath = normalizePath(skillFile);
  const normalizedCwd = normalizePath(cwd);
  const home = normalizePath(homedir());

  if (normalizedPath === `${home}/.agents/skills/${name}/SKILL.md`) {
    return "global @ ~/.agents/skills/<name>/SKILL.md";
  }

  if (normalizedPath === `${home}/.pi/agent/skills/${name}/SKILL.md`) {
    return "global @ ~/.pi/agent/skills/<name>/SKILL.md";
  }

  if (normalizedPath.endsWith(`/.pi/skills/${name}/SKILL.md`)) {
    return "project @ .pi/skills/<name>/SKILL.md";
  }

  if (normalizedPath.endsWith(`/.agents/skills/${name}/SKILL.md`)) {
    return "project @ .agents/skills/<name>/SKILL.md";
  }

  if (normalizedPath.startsWith(home + "/")) {
    return `read ${normalizedPath.replace(home, "~")}`;
  }

  return `read ${normalizePath(relative(normalizedCwd, normalizedPath) || normalizedPath)}`;
}

function getHint(description?: string) {
  const text = normalizeText(description);
  if (!text) return "Load this skill when the task clearly matches it.";
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function buildSkillEntries(pi: ExtensionAPI, cwd: string): SkillEntry[] {
  const commands = pi.getCommands() as SkillCommand[];
  const seen = new Set<string>();
  const entries: SkillEntry[] = [];

  for (const command of commands) {
    if (command.source !== "skill") continue;

    const skillFile = command.sourceInfo?.path;
    if (!skillFile) continue;

    const name = getSkillName(skillFile, command.name);
    if (!name || seen.has(name)) continue;

    seen.add(name);
    entries.push({
      name,
      hint: getHint(command.description),
      pathHint: getPathHint(skillFile, name, cwd),
    });
  }

  return entries;
}

function buildCompactSkillsBlock(skills: SkillEntry[]) {
  return [
    START_TAG,
    ...INTRO_LINES,
    "",
    ...skills.map((skill) => `- ${skill.name} [${skill.pathHint}]: ${skill.hint}`),
    END_TAG,
  ].join("\n");
}

export default function slimSkillsExtension(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event, ctx) => {
    const prompt = event.systemPrompt;
    if (!prompt) return;

    const startIdx = prompt.indexOf(START_TAG);
    const endIdx = prompt.indexOf(END_TAG);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return;

    const skills = buildSkillEntries(pi, ctx.cwd);
    if (skills.length === 0) return;

    const compactBlock = buildCompactSkillsBlock(skills);
    const nextPrompt = prompt.slice(0, startIdx) + compactBlock + prompt.slice(endIdx + END_TAG.length);

    if (nextPrompt === prompt) return;
    return { systemPrompt: nextPrompt };
  });
}
