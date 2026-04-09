# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
mkdir -p ~/.pi
git clone git@github.com:umgbhalla/pi-config ~/.pi/agent

# 3. Run setup (installs packages + extension deps)
cd ~/.pi/agent && ./setup.sh

# 4. Add your API keys to ~/.pi/agent/auth.json

# 5. Restart pi
```

### Updating

```bash
cd ~/.pi/agent && git pull
```

---

## Architecture

This config uses **subagents** — visible pi sessions spawned in cmux terminals. Each subagent is a full pi session with its own identity, tools, and skills. The user can watch agents work in real-time and interact when needed.

### Key Concepts

- **Subagents** — visible cmux terminals running pi. Autonomous agents self-terminate via `subagent_done`. Interactive agents wait for the user.
- **Agent definitions** (`agents/*.md`) — one source of truth for model, tools, skills, and identity per role.
- **Plan workflow** — `/plan` spawns an interactive planner subagent, then orchestrates workers and reviewers.
- **Iterate pattern** — `/iterate` forks the session into a subagent for quick fixes without polluting the main context.

---

## Agents

Specialized roles with baked-in identity, workflow, and review rubrics.

| Agent | Model | Purpose |
|-------|-------|---------|
| **planner** | Opus 4.6 | Interactive brainstorming — clarify, explore, validate design, write plan, create todos |
| **scout** | Haiku 4.5 | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Opus 4.6 | Implements tasks from todos, commits with polished messages |
| **reviewer** | Codex 5.3 | Reviews code for quality, security, correctness (review rubric baked in) |
| **researcher** | Opus 4.6 | Deep research using parallel.ai tools + local repo inspection |
| **synthesizer** | Opus 4.6 | Fan-in role — merges multiple artifacts into one concise, source-grounded memo |
| **debugger** | Codex 5.3 | Reproduces bugs, isolates root cause, applies the smallest verified fix |
| **visual-tester** | Opus 4.6 | Visual QA — navigates web UIs via Chrome CDP, spots issues, produces reports |
| **auditor** | Codex 5.3 | Deep codebase audit — security, architecture, dependencies, operational risk |
| **autoresearch** | GPT-5.4 | Autonomous experiment loop — runs, measures, and optimizes iteratively |

## Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **commit** | Making git commits (mandatory for every commit) |
| **code-simplifier** | Simplifying or cleaning up code |
| **github** | Working with GitHub via `gh` CLI |
| **iterate-pr** | Iterating on a PR until CI passes |
| **learn-codebase** | Onboarding to a new project, checking conventions |
| **session-reader** | Reading and analyzing pi session JSONL files |
| **skill-creator** | Scaffolding new agent skills |
| **cmux** | Managing terminal sessions via cmux |
| **presentation-creator** | Creating data-driven presentation slides |
| **add-mcp-server** | Adding MCP server configurations |

## Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer/** | `/answer` command + `Ctrl+.` — extracts questions into interactive Q&A UI |
| **bg-sessions/** | Background session management — keep sessions running while switching |
| **cmux/** | cmux integration — notifications, sidebar, workspace tools |
| **cost/** | `/cost` command — API cost summary |
| **pi-mono/** | Dev tooling — diff viewer, file browser, prompt URL widget, redraws, TPS counter |
| **reload-and-resume/** | `reload_and_resume_runtime` tool — reload pi, then automatically continue in the same session |
| **restart/** | `/restart` command — restart the current session |
| **todos/** | `/todos` command + `todo` tool — file-based todo management |
| **watchdog/** | Monitors agent behavior |

## Commands

| Command | Description |
|---------|-------------|
| `/plan <description>` | Start a planning session — spawns planner subagent, then orchestrates execution |
| `/subagent <agent> <task>` | Manual one-off subagent spawn when you explicitly want it |
| `/iterate [task]` | Fork session into interactive subagent for quick fixes |
| `/iterate --agent <agent> [task]` | Typed self-fork — keep current context but adopt a named agent role |
| `agent_group(...)` | Standard orchestration primitive — launch one or many subagents and collect one grouped result |
| `active_subagents(...)` | Inspect running subagents from the main session |
| `message_subagent(...)` | Send a nudge/follow-up into a running subagent |
| `/switch` | Switch sessions while optionally keeping current one running in background |
| `/bg [list\|kill\|attach\|logs\|clear]` | Manage background sessions |
| `/answer` | Extract questions into interactive Q&A |
| `/todos` | Visual todo manager |
| `/cost` | API cost summary |
| `/resume` | Switch to a previous session |

## Packages

Installed via `pi install`, managed in `settings.json`.

| Package | Description |
|---------|-------------|
| [pi-interactive-subagents](https://github.com/HazAT/pi-interactive-subagents) | Subagent runtime + `agent_group(...)`, `/plan`, `/subagent`, `/iterate` |
| [pi-parallel](https://github.com/HazAT/pi-parallel) | Parallel web search, extract, research, and enrich tools |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | AI-generated session names |
| [pi-autoresearch](https://github.com/HazAT/pi-autoresearch) | Autonomous experiment loop with dashboard |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP server integration |
| [glimpse](https://github.com/HazAT/glimpse) | Native macOS UI — dialogs, forms, visualizations |
| [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) | Chrome DevTools Protocol CLI for visual testing |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer`, `todos`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`
