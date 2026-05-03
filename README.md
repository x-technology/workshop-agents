# HolyJS 2026 Agent Runtime Workshop

This folder contains runnable code samples that map to the workshop plan. The practical flow is built around an email triage agent that classifies incoming emails into `task`, `event`, or `no_action` and routes them to downstream agents.

Step `01` uses a direct OpenAI-compatible HTTP call with no SDK, and falls back to naive keyword routing when `OPENAI_API_KEY` is not set. Step `02` uses the Google ADK (`@google/adk`) to define reusable agents. Later steps reuse those same agents for orchestration, n8n, and wrapper-based production concerns.

## Quick start

```bash
cd 2026-02-28-holyjs-workshop
node -v
npm install
npm run start:01
```

## Mapping to the agenda

1. Теория про агентов. Что такое вообще
   - See `src/runtime/README.md` for the runtime model and architecture notes.
2. Разработка агента "на коленке"
   - Run `npm run start:01` and open `src/01-standalone/run.js`.
3. Теория про SDK для агентов
   - See `src/02-sdk/README.md` for the Google ADK overview.
4. Разработка агента на SDK
   - Run `npm run start:02` and open `src/02-sdk/run.js`.
5. Теория про оркестрацию. Что делать, когда агентов несколько
   - Run `npm run start:03` and open `src/03-orchestrator/run.js`.
6. Разработка ещё одного-двух агентов и встраивание его в n8n
   - Run `npm run start:04` and open `src/04-n8n/README.md`.
7. Теория общих правил оркестрации. Безопасность, мониторинг и т.д.
   - Run `npm run start:05` and open `src/05-security-observability/run.js`.
8. Практика
   - Use `src/examples/` for exercises and tasks.
9. Конец

## Structure

- `src/01-standalone/` raw LLM email triage over HTTP without an SDK
- `src/02-sdk/` Google ADK agents: classify email, simulate task creation, simulate agenda item creation
- `src/03-orchestrator/` monolithic single-file orchestration over the step 02 agents
- `src/04-n8n/` n8n integration nodes for visual orchestration over the step 02 agents
- `src/05-security-observability/` wrappers for prompt-injection checks and success/error observability
- `src/examples/` practice tasks and sample emails
- `src/runtime/` runtime model notes (kept for theory section)
  - Also includes the small OpenAI-compatible helper reused by step `01`

## Notes

- Step `01` uses a real model when `OPENAI_API_KEY` is set, otherwise it falls back to naive keyword routing.
- Step `02` stays on the ADK code path even without credentials by using a local keyword-based `BaseLlm` fallback.
- Step `02` also supports Gemini, OpenAI, or a local OpenAI-compatible endpoint via `SDK_PROVIDER`; see `src/02-sdk/README.md`.
- Step `03` is intentionally monolithic and reuses the step `02` agents from one file.
- Step `04` reuses the same step `02` agents in n8n nodes, plus the step `03` router as a shortcut node.
- Step `05` wraps existing agents for prompt-injection blocking and success/error monitoring instead of re-implementing routing.
