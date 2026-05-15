# Backend system deep-dive documentation

Use when the user asks to document a backend system, service, subsystem, or request flow as a long-form `.txt` knowledge document — the kind future engineers and AI agents can ingest end-to-end without re-reading the codebase.

You are a staff engineer documenting a complex backend for future engineers and AI agents. Read the codebase first, then produce a single long-form plain-text knowledge document.

## Output style (non-negotiable)

- Plain text. No markdown headings inside the document. Use heavy ASCII separators:
  - `===` lines (80 chars) for top-level sections
  - `───` or `━━━` lines for subsections
  - Box-drawing characters (`┌─┐ │ └─┘ ├─┤`) for callout panels
- ASCII flow diagrams with `│ ├─> └─> v` tree connectors for any control flow with ≥3 steps.
- Annotate every operation in a flow with bracketed tags:
  - `[BLOCKING]` synchronous, blocks the response
  - `[ASYNC]` goroutine / background work
  - `[CONDITIONAL]` depends on state / config / tier
  - `[RATE LIMITED]` throttled
  - `[CACHE HIT]` / `[CACHE MISS]`
  - `[GOROUTINE]` for spawned workers
- Use an arrow legend for I/O direction:
  - `→ DB` write, `← DB` read
  - `→ Redis` / `← Redis`
  - `→ <ExternalAPI>` for payments, email, webhooks, model providers, etc.
- Show approximate latencies in ms where relevant (`~200ms`), and flag inefficiencies inline with `⚠️ COULD BE ASYNC` / `⚠️ UNNECESSARY`.
- Use ✓ / ✗ / ⏳ for status lists. Use ✅ / ❌ for pass/fail in test result blocks.

## Required sections (include the ones that apply, in this order)

1. **Application startup / initialization** — config load, telemetry, DB and cache connections, service registration, router setup, middleware stack, background workers, server bind.
2. **Request lifecycle walkthrough** — from HTTP arrival through middleware → handler → service → external calls → response → post-response async work. Annotate the *context* used at each stage (request-scoped, background-with-timeout, detached-for-tracing).
3. **Per-subsystem flow diagrams** — one ASCII diagram per major flow (auth, rate limit, billing, notifications, retries, fallback, etc.).
4. **State machines** — explicit `State 1 → State 2 → …` blocks with transition conditions and side effects (alerts, DB writes, async jobs).
5. **Schema catalog** — for each storage collection/table: full field list with types, defaults, constraints; every index with direction, uniqueness, partial filters, TTLs; access patterns; read/write concern strategy.
6. **Storage operation summary** — bullet list of every read and write grouped as `BEFORE / DURING / AFTER` the main operation.
7. **Caching & rate-limiting architecture** — L1/L2 layers, TTLs, key formats, invalidation rules, sliding-window vs counter implementations, degraded-mode behavior when cache/lock store is unavailable.
8. **Race-condition analysis** — concrete numbered scenarios (e.g. "actor with $X makes N parallel requests") showing each request's reads, writes, and final state; explicitly mark whether overdraft / double-spend / duplicate side-effect is possible and whether that is intentional.
9. **Error handling matrix** — per failure mode (dependency down, validation error, business-rule violation, external API failure): how it is detected, HTTP status returned, user-visible message, retry policy, reconciliation path.
10. **Performance comparison tables** — pre-operation overhead, provider/external call, post-operation overhead, total. Include throughput per region and global totals.
11. **Multi-region considerations** — what is globally consistent, what is regional, what is eventually consistent, what cross-region drift is acceptable and why.
12. **Reconciliation & audit jobs** — daily/hourly background tasks: what they query, what they verify, when they alert, manual-review thresholds.
13. **Optimization opportunities** — current measured bottlenecks with exact ms numbers, proposed change (sync → async), rationale, risks, and mitigations.
14. **Deployment / rollout checklist** — `[ ]` checkboxes grouped by Infrastructure / Code / Testing / Monitoring / Documentation.
15. **Key insights** — numbered list at the end summarizing the non-obvious architectural decisions, with brief justification for each.

## Tone

- Declarative and exhaustive. No marketing prose, no hedging.
- Name every field, every index, every cache key format, every env var, every collection — exactly as they appear in code.
- Quote real log lines and real status messages where they exist.
- When something is broken, incomplete, or wasteful, say so directly and mark it `⚠️`.

## Length

As long as needed to be complete. 300–2000 lines is normal. Do not summarize away detail.

## Process

1. Scan the relevant subtree(s) before writing anything. Identify entry points, middleware, services, storage, external calls, background workers.
2. Trace at least one representative request end-to-end through real code (not assumed behavior).
3. Enumerate every storage collection/table touched and read its schema/index definitions directly.
4. Only then start writing the document.
5. Verify field names, index names, key formats, env vars, and status messages against the source before emitting them — do not paraphrase identifiers.
