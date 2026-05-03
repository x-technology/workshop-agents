# LLM Context: HolyJS 2026 Agent Runtime Workshop

This repository is a workshop project for building agent runtimes in Node.js. The practical flow demonstrates an email triage agent that classifies incoming emails into `task`, `event`, or `no_action` and routes them to specialized agents. Step `01` uses a direct OpenAI-compatible HTTP call without any SDK and falls back to naive keyword routing when `OPENAI_API_KEY` is not set. Step `02` defines reusable agents through the Google ADK. The Google ADK demo uses Gemini when `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set, otherwise it falls back locally through a keyword-based `BaseLlm`.

## Project goals

- Teach agent runtime concepts (planning, memory, tool execution, coordination).
- Show how to build a production-friendly control plane in Node.js.
- Demonstrate routing and multi-agent coordination via an email triage use case.
- Keep later examples runnable offline, but ready to swap to real LLMs.

## Quick start

```bash
cd /Users/paulcodiny/Projects/2026-02-28-holyjs-workshop
npm install
npm run start:01
```

## How the email flow works

1. `src/02-sdk/` provides three reusable agents: classify email, create task simulation, create agenda item simulation.
2. `src/03-orchestrator/` orchestrates those agents in one monolithic file.
3. `src/04-n8n/` exposes the same agent boundaries as workflow nodes.
4. `src/05-security-observability/` wraps existing agents with prompt-injection checks and success/error monitoring.

## Model selection

- `src/01-standalone/` uses `src/runtime/openai-compatible.js` for raw OpenAI-compatible HTTP calls.
- `src/02-sdk/` resolves either Gemini, OpenAI-compatible, or local fallback models.

## Folder summary

- `src/01-standalone/`
  - Direct LLM email classifier with no SDK (`run.js`).

- `src/02-sdk/`
  - Google ADK demo using reusable classification and specialist agents (`run.js`).
  - Short README describing SDK rationale.

- `src/03-orchestrator/`
  - Single-email orchestration example that intentionally keeps classification and specialist dispatch in one place (`run.js`).

- `src/04-n8n/`
  - n8n nodes for classification and specialist-agent orchestration.
  - README with payload examples.

- `src/05-security-observability/`
  - Wrappers for security and success/error trace logging (`run.js`, `trace.jsonl` created at runtime).

- `src/examples/`
  - Sample emails and practice tasks.

- `src/runtime/`
  - Minimal runtime notes kept for theory section.
  - Also contains the reusable OpenAI-compatible HTTP helper and tracer used by step `01`.

## Entry points

- `npm run start:01` → standalone triage via raw OpenAI-compatible HTTP, with naive fallback when no API key is set
- `npm run start:02` → Google ADK classifier + specialist agent flow for one email
- `npm run start:03` → monolithic orchestration for one email using the step 02 agents
- `npm run start:04` → stage n8n nodes for visual orchestration
- `npm run start:05` → security + observability wrappers around the step 02 agents

## Environment variables

- `OPENAI_API_KEY` — if set, uses a real model.
- `OPENAI_BASE_URL` — optional OpenAI-compatible base URL for step `01` and local-compatible setups.
- `OPENAI_MODEL` — optional model override for step `01`.
- `SDK_PROVIDER` — choose `auto`, `gemini`, `openai`, or `local` for step `02`.

## Notes for LLMs

- Keep outputs strict JSON when asked, because routers parse JSON.
- Avoid writing outside `src/` unless adding docs or configs.
- Aim for small, teachable code. The workshop prioritizes clarity over completeness.
- The practical code path is the `src/01-standalone` → `src/02-sdk` → `src/03-orchestrator` → `src/04-n8n` → `src/05-security-observability` progression.
