# LLM Context: HolyJS 2026 Agent Runtime Workshop

This repository is a workshop project for building agent runtimes in Node.js. The practical flow demonstrates an email triage agent that classifies incoming emails into `task`, `event`, or `no_action` and routes them to specialized agents. The workshop intentionally stays small and offline-friendly. A mock model is provided so the demos run without API keys. If `OPENAI_API_KEY` is set, the AI SDK uses a real model.

## Project goals

- Teach agent runtime concepts (planning, memory, tool execution, coordination).
- Show how to build a production-friendly control plane in Node.js.
- Demonstrate routing and multi-agent coordination via an email triage use case.
- Keep examples runnable offline, but ready to swap to real LLMs.

## Quick start

```bash
cd /Users/paulcodiny/Projects/2026-02-28-holyjs-workshop
npm install
npm run start:01
```

## How the email flow works

1. `routeEmail` classifies an email as `task`, `event`, or `no_action`.
2. It dispatches to the corresponding agent:
   - `taskAgent`
   - `eventAgent`
   - `noActionAgent`
3. Each agent uses the AI SDK to generate structured JSON output.

## Model selection

- `src/ai/model.js` selects the model.
- Uses a mock model by default if no API key is set.
- Real model is used when `OPENAI_API_KEY` is available.

## Folder summary

- `src/agents/`
  - Email router and downstream agents (`email-router.js`).
  - Central entry for classification and dispatch.

- `src/ai/`
  - Model selection and mock fallback (`model.js`).

- `src/01-standalone/`
  - From-scratch rule-based classifier to show baseline runtime logic (`run.js`).

- `src/02-sdk/`
  - AI SDK demo using the email router (`run.js`).
  - Short README describing SDK rationale.

- `src/03-orchestrator/`
  - Multi-email orchestration example (`run.js`).

- `src/04-n8n/`
  - Minimal webhook receiver to integrate with n8n (`webhook-receiver.js`).
  - README with payload examples.

- `src/05-security-observability/`
  - Guardrails + trace logging (`run.js`, `trace.jsonl` created at runtime).

- `src/examples/`
  - Sample emails and practice tasks.

- `src/runtime/`
  - Minimal runtime notes kept for theory section.
  - No longer used in main demos; kept for teaching.

## Entry points

- `npm run start:01` → rule-based standalone triage
- `npm run start:02` → AI SDK triage for one email
- `npm run start:03` → orchestration across many emails
- `npm run start:04` → webhook receiver for n8n
- `npm run start:05` → security + observability demo

## Environment variables

- `OPENAI_API_KEY` — if set, uses a real model.
- `USE_MOCK=1` — forces mock model even if API key exists.

## Notes for LLMs

- Keep outputs strict JSON when asked, because routers parse JSON.
- Avoid writing outside `src/` unless adding docs or configs.
- Aim for small, teachable code. The workshop prioritizes clarity over completeness.
