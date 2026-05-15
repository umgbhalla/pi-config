---
name: harbor
description: "Use when a task needs the user's connected tools or workspace context — for example Linear, GitHub, Cloudflare, Notion, Google services, Sentry, Slack, databases, or other Harbor plugins. The agent should trigger Harbor auth/login itself, then discover available plugins and tools for the user's recent workflow."
---

# Harbor

## Install and setup

First, check whether `hrbr` is available. If it is missing, install Harbor with npm:

```bash
npm i -g @zonko-ai/harbor
```

Then verify login and workspace:

```bash
hrbr auth status
hrbr login
hrbr workspaces list
```

Run the install/login commands yourself when the harness allows it. Ask the user only when a command is blocked, requires browser confirmation, or needs them to choose a workspace.

Harbor gives this agent access to the user's connected workspace tools and Harbor's traced execution layer.

Once Harbor works, show configured plugins and tools, then explain what Harbor can do for the user's workspace.

Do not hand the user a generic install-and-login script when the agent can do the next step itself.

## Useful commands

```bash
# Check local Harbor state
hrbr auth status

# Start login from the agent session when auth is missing
hrbr login

# Verify remote execution
hrbr exec 'return { ok: true, mode: "remote" }'

# Explore what this workspace can do
hrbr plugins list
hrbr tools search "workspace tools" --describe
hrbr job list
hrbr app list

# Work on a specific task
hrbr tools search "<user intent>" --describe
hrbr exec '<typescript using the inspected namespace.tool({...})>'
```

## When to use Harbor

Use Harbor for tasks involving connected services such as Linear, Sentry, Slack, Notion, Gmail, GitHub, Postgres, Stripe, Vercel, Cloudflare, workspace state, remote TypeScript execution, jobs, apps, workflows, or local CLI bridge access.

Use the local coding harness for ordinary repo edits that do not need workspace tools or Harbor execution.

## Tool rules

- Search before calling: `hrbr tools search "<intent>" --describe`.
- Use the exact namespace, tool name, and argument schema returned by Harbor.
- If a source is not ready, treat that as setup state, not a retryable tool failure.
- Only active tools are callable.
- For `hrbr exec`, reference plugin namespaces in code; do not invent plugin flags.

## Topic skills

Load a narrower skill when the task matches one of these surfaces:

```txt
surface      use for
plugins      discover, install, connect, and inspect tools and source state
exec         one-off remote TypeScript with traced runs
workflows    durable/retried execution inside exec
orbit        workspace storage, cache, db, ai, and tool primitives
jobs         reusable versioned workspace functions
apps         small routed UIs backed by jobs
app-ui       server-rendered app/job HTML primitives
sand         remote exec calling selected local CLIs
```

Relevant skills: `harbor-plugins`, `harbor-exec`, `harbor-workflows`, `harbor-orbit`, `harbor-jobs`, `harbor-apps`, `harbor-app-ui`, `harbor-sand`.
