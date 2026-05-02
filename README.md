# HolyJS 2026 Agent Runtime Workshop

This folder contains runnable code samples that map to the workshop plan. The practical flow is built around an email triage agent that classifies incoming emails into `task`, `event`, or `no_action` and routes them to downstream agents.

Most demos use the official Vercel AI SDK (`ai` npm package). The SDK step (`src/02-sdk/`) uses the Google ADK (`@google/adk`). A mock model or local fallback is provided for offline runs.

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

- `src/01-standalone/` from-scratch agent loop
- `src/02-sdk/` Google ADK single-agent triage
- `src/03-orchestrator/` single-email orchestrator that reuses the step 02 classifier
- `src/04-n8n/` n8n webhook integration mock
- `src/05-security-observability/` policies, tracing, guardrails
- `src/examples/` practice tasks and sample emails
- `src/runtime/` runtime model notes (kept for theory section)

## Notes

- The AI SDK uses a mock model when `OPENAI_API_KEY` is not set.
- The ADK demo uses Gemini when `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set, otherwise it falls back locally.
- The ADK demo also supports OpenAI or a local OpenAI-compatible endpoint via `SDK_PROVIDER`; see `src/02-sdk/README.md`.
- Replace the model in `src/ai/model.js` when using a real provider.
