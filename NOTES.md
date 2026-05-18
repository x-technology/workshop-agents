# Presenter Notes

These notes are for the practical part only. Assume the audience already had 2 hours of theory. The job here is to walk through the code, show how the pieces connect, and point out the engineering tradeoffs in implementation.

The repository is small and intentionally repetitive: the same email-triage use case is rebuilt five times, each time adding one production concern.

## Core Story

One email comes in. We need to decide:

- `task`
- `event`
- `no_action`

That simple router becomes the backbone for the whole workshop:

1. raw LLM call
2. SDK-based single agent
3. multiple specialist agents with orchestration
4. the same boundaries exposed in n8n
5. security and observability wrapped around the same agents

The strongest message to repeat: most “agent systems” are still ordinary software. The hard parts are interfaces, control flow, fallback behavior, and operational safety.

## Practical Framing

Because theory was already covered, skip long definitions of agents, memory, planning, or safety. Treat those as already-known concepts and keep returning to:

- where the boundary is in code
- what changed from the previous step
- why this design is easier to extend or operate

Useful opening line:

- The practical part is not about “what is an agent”, but about how the same behavior evolves from one raw model call into a small, operable system.

## Recommended Time Split

### If you have 30 minutes

1. 3 min: repo map and the through-line of the email example
2. 7 min: step `01`
3. 10 min: step `02`
4. 7 min: step `03`
5. 5 min: step `04`
6. 6 min: step `05`
7. 2 min: wrap-up

### If you have 60 minutes

1. 5 min: repo map and execution model
2. 10 min: step `01`
3. 15 min: step `02`
4. 10 min: step `03`
5. 8 min: step `04`
6. 8 min: step `05`
7. 4 min: Q&A / exercises

## Best Walkthrough Order

For code-only delivery, this order is cleaner than following the README top to bottom:

1. `README.md`
2. `src/01-standalone/run.js`
3. `src/runtime/openai-compatible.js`
4. `src/runtime/tracer.js`
5. `src/02-sdk/run.js`
6. `src/02-sdk/agents.js`
7. `src/02-sdk/adk-runner.js`
8. `src/02-sdk/model-resolver.js`
9. `src/02-sdk/fallback-llm.js`
10. `src/03-orchestrator/email-router.js`
11. `src/03-orchestrator/agents.js`
12. `src/04-n8n/EmailClassification.node.js`
13. `src/04-n8n/TaskSimulation.node.js`
14. `src/04-n8n/AgendaSimulation.node.js`
15. `src/05-security-observability/observability.js`
16. `src/05-security-observability/run.js`

Why this order:

- start from the thinnest possible implementation
- explain the reusable runtime helpers once
- show how step `02` becomes the reusable core
- show how later steps mostly adapt or wrap earlier code

## What To Say Before Opening Code

- We only have one business problem in the repo: classify an email, then route the result.
- Every later step preserves that contract and changes the execution model around it.
- The fastest way to understand the repo is to track where `category` is produced and who consumes it.

Use this as the anchor for the whole walkthrough:

- input: email
- intermediate contract: `{ category, confidence, reason }`
- output: simulated task, simulated agenda item, or no-action result

## Repo Map

The audience should understand the repo in one sentence:

- `src/01-standalone/`: direct OpenAI-compatible call
- `src/02-sdk/`: one reusable classifier built on Google ADK
- `src/03-orchestrator/`: composition of classifier + specialist agents
- `src/04-n8n/`: the same logic exposed as workflow nodes
- `src/05-security-observability/`: wrappers for safety and monitoring
- `src/examples/`: sample inputs and exercises

One strong practical observation:

- `src/02-sdk/` is the real center of gravity.
- `src/03-orchestrator/` consumes it.
- `src/04-n8n/` adapts it.
- `src/05-security-observability/` wraps it.

That means the workshop is really about building one stable contract and preserving it.

## Step 01: “Agent On Bare Metal”

Open:

- `src/01-standalone/run.js`
- `src/runtime/openai-compatible.js`
- `src/runtime/tracer.js`

Main teaching point:

- This is the minimum viable “agent-like” system: prompt + schema + model call + fallback + trace.

Code path to narrate:

1. build sample emails
2. define route JSON schema
3. choose LLM vs keyword fallback
4. classify each email
5. log result to JSONL trace

What the code does:

- Defines three sample emails in one file.
- Defines a strict JSON schema for the route result.
- Calls an OpenAI-compatible `/chat/completions` endpoint directly.
- Falls back to `naiveCategorize()` when `OPENAI_API_KEY` is missing.
- Writes JSONL trace events with `createTrace()`.

What to emphasize:

- The system prompt is explicit and narrow.
- `response_format.json_schema` is doing real work here. It is enforcing structured output.
- The fallback is deliberately dumb, but it keeps the workshop runnable.
- Even in the simplest version, the code already needs tracing and error handling.

Function-level notes:

- `naiveCategorize(email)` is intentionally not “smart”. It exists to preserve the rest of the control flow.
- `routeWithLlm(email)` is the first place where business logic and infrastructure are visibly mixed.
- `routeWithFallback(email)` mirrors the LLM path so both paths look similar operationally.
- `main()` does provider selection in the simplest possible way: check whether there is an API key.

What to point at in `src/runtime/openai-compatible.js`:

- `resolveOpenAICompatibleConfig()` centralizes `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.
- `createJsonCompletion(...)` is a thin wrapper over `fetch`.
- The important engineering choice is not the wrapper itself, but that every caller can demand strict JSON.

What to point at in `src/runtime/tracer.js`:

- The tracer is intentionally tiny and sync-file-based.
- `startRun()` / `endRun()` are enough to introduce the idea of observability without adding a real tracing stack.
- There is already a run/span/event vocabulary, even if the step barely uses spans.

Key talking line:

- Before people talk about memory, tools, or autonomous loops, they usually need reliable structured output first.

Useful critique to mention:

- This step mixes concerns in one file: prompting, execution, sample data, and logging.
- It is fine for teaching, but it does not scale.

Practical caveat:

- In this environment, `npm run start:01` failed because it tried to write `src/01-standalone/trace.jsonl`. If you demo it live, verify write permissions first.

Extra code critique:

- `shouldUseLlm = Boolean(config.apiKey)` ignores `isConfigured` from `resolveOpenAICompatibleConfig()`, so a custom base URL without an API key would still not be used here.
- That is a good example of how “simple demo code” can accidentally narrow a more general helper.

## Step 02: “One Real Agent Through an SDK”

Open:

- `src/02-sdk/run.js`
- `src/02-sdk/agents.js`
- `src/02-sdk/adk-runner.js`
- `src/02-sdk/model-resolver.js`
- `src/02-sdk/fallback-llm.js`
- `src/02-sdk/fallback.js`

Main teaching point:

- The SDK is not magic. It standardizes the execution contract.

Code path to narrate:

1. `run.js` logs the model selection reason
2. `classifyEmailAgent()` resolves a model
3. if no remote model is available, use `KeywordFallbackLlm`
4. otherwise execute the same agent contract through ADK
5. parse and normalize the result

What the code does:

- `classifyEmailAgent()` becomes the reusable boundary.
- `resolveModel()` selects Gemini, OpenAI-compatible, local OpenAI-compatible, or a local fallback model.
- `runEmailAgent()` creates `LlmAgent`, wraps it in `InMemoryRunner`, and calls `runEphemeral(...)`.
- The response is parsed through `safeJsonParse()` and normalized.

What to emphasize:

- This is still one agent, one job.
- `runEphemeral(...)` is an important design signal: this step is intentionally stateless.
- `KeywordFallbackLlm` is clever for a workshop because it preserves the ADK code path even when no credentials exist.
- `normalizeClassification()` protects the rest of the system from model drift and malformed JSON.

File-by-file code notes:

- `agents.js`: keeps the exported API small. This file is almost purely composition.
- `model-resolver.js`: the key file for practical understanding of provider switching.
- `config.js`: simple constants, but useful to show how defaults are kept visible and non-magical.
- `json.js`: tiny helper, but it makes the parsing fallback obvious.

What to point at in `src/02-sdk/adk-runner.js`:

- `formatEmailForAgent(email)` is small but important because it creates one canonical prompt shape.
- `runEmailAgent(...)` is the generic runner for all later ADK-based agents.
- `for await (...)` over `runner.runEphemeral(...)` is worth showing because it makes the event-based execution model concrete.
- `finalResponse` is assembled from `content.parts`, which is useful if attendees have only seen chat APIs before.

What to point at in `src/02-sdk/model-resolver.js`:

- `PROVIDER=auto` means “prefer Gemini if available, otherwise OpenAI, otherwise fallback”.
- `local` uses the same OpenAI-compatible contract as step `01`, but through an ADK `BaseLlm` adapter.
- The code is doing capability substitution, not branching into separate agent logic.

What to point at in `src/02-sdk/fallback-llm.js`:

- This is one of the best workshop files to explain.
- It parses the prompt markers like `EMAIL_TO_CLASSIFY`, `TASK_CREATION_SIMULATION`, and `AGENDA_ITEM_SIMULATION`.
- It returns structured JSON text, not JS objects, because it is pretending to be a real model backend.
- This file demonstrates how much the runtime relies on stable prompt structure.

Good line to say:

- An SDK is valuable when it gives you a stable shape for models, sessions, and execution, not because it makes the prompt smarter.

Important detail:

- The fallback model subclasses `BaseLlm`. That means the same runner and agent interfaces still work offline.
- This is a strong teaching moment about abstraction boundaries.

If someone asks “where is the memory?”:

- It is not here yet, on purpose.
- This step shows one-shot execution. Persistent sessions would require a different runner flow than `runEphemeral(...)`.

Extra code critique:

- `safeJsonParse()` is intentionally forgiving, but in production you might want schema validation and explicit parse errors instead of silently swallowing bad output.
- `normalizeClassification()` is doing some of that cleanup, but not full validation.

## Step 03: “Orchestration Without Hype”

Open:

- `src/03-orchestrator/email-router.js`
- `src/03-orchestrator/agents.js`
- `src/03-orchestrator/run.js`

Main teaching point:

- Multi-agent orchestration can be boring and explicit. That is often better.

Code path to narrate:

1. receive an email
2. call the classifier from step `02`
3. branch on `classification.category`
4. invoke one specialist
5. return a combined object with `classification` and `result`

What the code does:

- Reuses the classifier from step `02`.
- Branches on `classification.category`.
- Calls one of two specialist agents:
  - task creation simulation
  - agenda item simulation
- Falls through to `createNoActionResult()`.

What to emphasize:

- The “specialist agents” are just focused functions with focused prompts.
- The orchestrator is a plain `if`/`else` router, not an autonomous planner.
- This is exactly the right level for many business workflows.

What to point at in `src/03-orchestrator/agents.js`:

- `createTaskAgent(...)` and `createAgendaItemAgent(...)` both normalize the incoming classification first.
- Both functions build a fallback result before calling the model. That means fallback is prepared as part of normal control flow, not as a last-minute exception path.
- `runTaskCreationSimulationAgent(...)` and `runAgendaItemSimulationAgent(...)` reuse `runEmailAgent(...)` from step `02`, which proves the classifier runtime became shared infrastructure.

Important practical observation:

- There is no autonomous inter-agent conversation here.
- The orchestrator owns the control flow, and the agents only own transformation of inputs into structured outputs.

Useful code critique:

- `createNoActionResult()` is async even though it only returns fallback data. That keeps the orchestrator API uniform.
- Uniform async boundaries are a small but good engineering choice for later extensibility.

Best architectural point:

- Step `03` does not rebuild classification. It composes around the classifier from step `02`.
- This is the moment to talk about agent boundaries as reusable business capabilities.

Useful critique to mention:

- The step is intentionally monolithic. `routeEmail()` knows too much about routing and downstream action types.
- In production, that may move into separate services, queues, or workflow definitions.

## Step 04: “From Code Orchestration To Visual Orchestration”

Open:

- `src/04-n8n/README.md`
- `src/04-n8n/EmailClassification.node.js`
- `src/04-n8n/TaskSimulation.node.js`
- `src/04-n8n/AgendaSimulation.node.js`
- `src/04-n8n/EmailRouter.node.js`
- `src/04-n8n/print-instructions.js`

Main teaching point:

- n8n is not a separate implementation. It is an adapter layer around the same functions.

Code path to narrate:

1. n8n passes `items`
2. node code normalizes email payloads
3. node calls existing JS function from step `02` or `03`
4. node wraps the result back into n8n item format
5. `continueOnFail()` decides whether to throw or emit an error item

What the code does:

- Wraps the classifier and specialists as n8n custom nodes.
- Accepts flexible payload shapes and normalizes them.
- Supports `continueOnFail()` in the n8n style.
- Provides one “shortcut” node (`Email Router`) that wraps the step `03` monolith.
- Creates lightweight shim files in `.n8n/custom` so n8n can scan them.

What to emphasize:

- The recommended workflow is not the monolithic shortcut node.
- The better teaching flow is: classify -> branch in n8n -> task/event specialist.
- That shows the orchestration graph visually and makes the branching explicit.

File-by-file code notes:

- `EmailClassification.node.js`: thinnest adapter; best file to show first.
- `TaskSimulation.node.js`: shows category validation before specialist execution.
- `AgendaSimulation.node.js`: same pattern as task simulation, which is useful because attendees see intentional repetition.
- `EmailRouter.node.js`: convenience node, but architecturally less interesting because it hides the graph.
- `print-instructions.js`: important for understanding local n8n bootstrapping.

Strong line:

- Low-code orchestration works best when your core logic already has clean boundaries.

Important implementation detail:

- The n8n nodes do almost no business logic themselves.
- That is good design. Workflow nodes should usually adapt and transport data, not re-implement domain behavior.

Extra code details worth mentioning:

- Payload normalization is intentionally permissive: raw email object, `{ email }`, or `{ emails: [] }`.
- Every output item includes `pairedItem`, which preserves item lineage in n8n.
- Errors are converted to `NodeOperationError`, which is the n8n-native error path.

## Step 05: “Wrap, Don’t Rewrite”

Open:

- `src/05-security-observability/run.js`
- `src/05-security-observability/observability.js`

Main teaching point:

- Security and monitoring should wrap agent boundaries, not be manually copied into every prompt call.

Code path to narrate:

1. build wrapped agent functions
2. run classification through wrapper
3. route to wrapped task or agenda agent
4. log success/failure into trace
5. summarize trace into reliability metrics

What the code does:

- Builds `classifyWithSecurity`, `taskWithSecurity`, and `agendaWithSecurity`.
- Uses `withPromptInjectionGuard(...)` before execution.
- Uses `withSuccessErrorMonitoring(...)` around execution.
- Writes JSONL events for success/failure.
- Summarizes reliability per agent from the trace log.

What to emphasize:

- This is decorator-style architecture.
- The original agent code stays small.
- Cross-cutting concerns are applied from the outside.

What to point at in `src/05-security-observability/observability.js`:

- `extractEmailFromInput(input)` lets the wrapper work with both raw email payloads and `{ email }` objects.
- `sanitizeEmail(email)` is intentionally primitive, but it clearly shows where a guard belongs.
- `withPromptInjectionGuard(agentFn)` and `withSuccessErrorMonitoring(agentFn)` are the most reusable pieces in the step.
- `summarizeReliability()` turns raw trace events into something a dashboard or node can consume.

Important practical observation:

- Step `05` does not fork the business logic.
- It imports the earlier functions and adds wrappers around them.
- That is the cleanest practical lesson in the repo.

Important honesty point:

- The prompt-injection check is intentionally simplistic. It matches obvious phrases like “ignore previous instructions” and “system prompt”.
- The point is not “this solves security”.
- The point is “put the guardrail at the boundary and make it reusable”.

Good line to say:

- Production agent systems usually fail less from model quality than from weak boundaries, weak monitoring, and weak safety controls.

Extra code critique:

- `summarizeReliability()` currently returns `totalEmails: 0` always, so the summary is intentionally incomplete.
- That is useful to mention because it shows the difference between “workshop observability” and production telemetry.

## The Best Narrative Thread

If you need one sentence per step:

1. `01`: raw LLM call with schema and fallback
2. `02`: wrap the logic in an SDK-friendly agent boundary
3. `03`: compose multiple focused agents with explicit routing
4. `04`: expose those boundaries to workflow tooling
5. `05`: add safety and observability as wrappers

This gives the audience a very clean mental model: same use case, same categories, same progression, increasing runtime maturity.

## Things Worth Calling Out In Discussion

- The repo intentionally prefers strict JSON outputs over free text.
- Fallback behavior is not an afterthought. It is central to workshop reliability.
- “Agent” here mostly means “bounded capability with model-backed behavior”.
- The orchestration logic is deterministic, even if model output is probabilistic.
- The n8n layer is useful because the boundaries were already designed cleanly in code.

## What Is Missing On Purpose

Mention these so advanced attendees do not think they were forgotten:

- no real long-term memory
- no tool-calling loop
- no retrieval layer
- no human approval workflow
- no queueing, retries, or concurrency controls
- no real calendar/task API integration, only simulation outputs

That is fine. The repo is trying to teach architecture increments, not ship a production agent platform.

## Suggested Live Demo Flow

If you demo from terminal:

1. `npm run start:02`
2. show `src/02-sdk/adk-runner.js`
3. `npm run start:03`
4. show `src/03-orchestrator/email-router.js`
5. `npm run start:05`
6. show `src/05-security-observability/observability.js`

Why this order:

- step `01` is conceptually useful, but step `02` is a better live starting point because it shows the reusable abstraction immediately
- step `03` proves the classifier becomes infrastructure
- step `05` ends on production concerns, which is where audience interest usually goes

Observed outputs from this repo in the current environment:

- `start:02` worked with the keyword fallback model and printed ADK events plus a `task` classification
- `start:03` worked and produced a simulated task object
- `start:05` worked, blocked the prompt-injection sample, and produced a per-agent reliability summary

## Practical Talking Points By File

Use this if you want a more literal file walkthrough.

### `src/01-standalone/run.js`

- Three hardcoded emails are enough to show all categories.
- The route schema is local to the file because this step is intentionally unabstracted.
- The code shows the first real tradeoff: directness versus reusability.

### `src/runtime/openai-compatible.js`

- This is plain HTTP, not an SDK.
- The helper is reusable, but it still exposes all the transport details clearly.
- Good file to show people what an LLM call really reduces to at runtime.

### `src/runtime/tracer.js`

- Tiny JSONL logger.
- Good example of adding just enough operational visibility without introducing infrastructure.

### `src/02-sdk/agents.js`

- This file is almost all boundary design.
- It proves that an “agent” can be represented as a small exported function.

### `src/02-sdk/adk-runner.js`

- Best file to explain how the SDK is actually used.
- The generic runner pattern here is what enables code reuse in later steps.

### `src/02-sdk/model-resolver.js`

- Best file to explain provider abstraction.
- Also a good place to explain why workshop code needs offline fallback.

### `src/02-sdk/fallback-llm.js`

- Best hidden gem in the repo.
- It behaves like a fake model backend and lets the same runtime execute without credentials.

### `src/03-orchestrator/email-router.js`

- Best file to show that orchestration can be simple.
- The contract is obvious and readable in under a minute.

### `src/03-orchestrator/agents.js`

- Best file to discuss specialist agents.
- Also useful to show how structured prompts are tailored per downstream action.

### `src/04-n8n/*.node.js`

- Best files to discuss integration boundaries.
- The interesting part is not n8n itself, but how little code is needed because the core contracts are already clean.

### `src/05-security-observability/observability.js`

- Best file to discuss wrappers and cross-cutting concerns.
- Probably the most “production-shaped” file in the workshop.

## Shorter Wrap-Up For Practical Session

If you only want a code-focused closing:

- Step `01` shows the raw mechanics.
- Step `02` extracts a reusable execution boundary.
- Step `03` composes that boundary into a simple orchestrator.
- Step `04` adapts the same boundary to n8n.
- Step `05` wraps the same boundary with safety and monitoring.

That is the practical lesson: keep the core contract stable, and change the layers around it.

## Questions You Can Ask The Audience

- At which step does this stop being “just a prompt” and start being a system?
- Where would you put retries: inside the agent or outside it?
- Should prompt-injection defense live in prompts, wrappers, or upstream input validation?
- If this became real product code, which simulated outputs would you replace first with actual integrations?
- Would you keep the orchestration in code or move it into a workflow engine?

## Short Wrap-Up

If you need a closing summary:

- Step `01` teaches that direct LLM integration is possible but fragile.
- Step `02` introduces a clean agent execution contract.
- Step `03` shows that orchestration is mostly software design.
- Step `04` proves those boundaries port cleanly into workflow tools.
- Step `05` shows that safety and observability belong around the system, not inside ad hoc prompts.

That is the real workshop message: agent engineering is less about “making the model smarter” and more about designing reliable boundaries around model behavior.
