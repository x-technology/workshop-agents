# HolyJS 2026 Agent Runtime Workshop

This file is a presenter brief for preparing slides and running the workshop.

Assumption: total duration is about 3 hours, split into:

- 1 hour of theory
- 2 hours of practical walkthrough and demos

The workshop uses one concrete use case from start to finish: an email triage system that classifies incoming emails into `task`, `event`, or `no_action`, then routes them to specialized agents.

## Audience

- JavaScript or Node.js developers
- Engineers curious about agent runtimes, orchestration, and production concerns
- People who may have used LLM APIs before, but have not built a runtime/control plane around them

## Learning Outcomes

By the end of the workshop, attendees should understand:

- what an agent runtime is, beyond "call an LLM with a prompt"
- how routing, structured output, and specialization make simple agents more reliable
- how Node.js works well as a control plane for agents
- how orchestration differs from a single-agent flow
- how to add guardrails, tracing, and reliability monitoring
- how to expose agent capabilities to external automation tools like n8n

## Workshop Narrative

Use one storyline throughout:

1. Start with a naive classifier to show the minimum viable behavior.
2. Replace hardcoded logic with an SDK-driven agent.
3. Scale from one email to many emails and discuss orchestration.
4. Plug the flow into n8n so it becomes part of a larger business workflow.
5. Add security and observability so the system becomes production-friendly.

The repo intentionally stays small and offline-friendly. That is a feature, not a limitation.

## High-Level Agenda

### Part 1: Theory - 60 min

1. Agent runtime fundamentals - 15 min
2. Runtime building blocks in this repo - 15 min
3. Control plane concerns: tools, memory, policy, tracing - 15 min
4. Production shape: orchestration, automation, and reliability - 15 min

### Part 2: Practical Walkthrough - 120 min

1. Step 01: standalone baseline - 15 min
2. Step 02: SDK-based agent - 25 min
3. Step 03: multi-email orchestration - 20 min
4. Step 04: n8n integration - 30 min
5. Step 05: security and observability - 20 min
6. Wrap-up and Q&A - 10 min

## Theory Hour

### 1. What is an agent runtime?

Topics to cover:

- Difference between a single prompt call and a runtime
- Why a runtime needs coordination, state, policies, and tool boundaries
- Why "agent" does not have to mean autonomous or magical
- Why most useful agent systems are narrow, structured, and operationally constrained

Slides should include:

- a simple diagram: input -> classifier/router -> specialist agents -> output
- a contrast between "LLM as function" and "runtime as control plane"

### 2. Why Node.js for agent runtimes?

Topics to cover:

- Node.js as orchestration layer, not just web backend
- Good fit for I/O, async workflows, webhooks, SDK glue, and automation
- Easy integration with external systems, CLIs, and workflow tools

Repo references:

- [src/runtime/README.md](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/README.md:1)
- [src/runtime/core.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/core.js:1)

### 3. Runtime building blocks

Topics to cover:

- Planner: decides the next steps
- Tools: explicit capabilities, not arbitrary code execution
- Memory: short-term vs long-term
- Policy: what tools are allowed and with what payload limits
- Tracing: every run and tool span should be inspectable

Repo references:

- [src/runtime/planner.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/planner.js:1)
- [src/runtime/memory.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/memory.js:1)
- [src/runtime/policy.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/policy.js:1)
- [src/runtime/tracer.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/runtime/tracer.js:1)
- [src/tools/index.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/tools/index.js:1)

### 4. Structured outputs and routing

Topics to cover:

- Why routers should return strict JSON
- Why constrained categories improve predictability
- Why specialized downstream agents are easier to reason about than one giant prompt

Repo references:

- [src/agents/email-router.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/agents/email-router.js:1)
- [src/ai/model.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/ai/model.js:1)

### 5. Production concerns

Topics to cover:

- guardrails against prompt injection
- observability and audit logs
- failure modes and fallback behavior
- orchestration across many inputs
- connecting agent logic to external systems like n8n

This section should prepare the audience for steps 03, 04, and 05.

## Practical Walkthrough

### Step 01: Standalone Baseline

Files:

- [src/01-standalone/run.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/01-standalone/run.js:1)

Command:

```bash
npm run start:01
```

Topics to cover:

- Start with raw email examples
- Implement simple keyword-based classification
- Show that routing can exist before any model is introduced
- Explain the strengths of a deterministic baseline
- Explain its limits: brittle heuristics, low coverage, hard to extend

What to show on slides:

- one slide with the three sample emails
- one slide with the `naiveCategorize` logic
- one slide with "what breaks in production?"

Main teaching point:

Do not start with "AI first". Start with the workflow shape and failure modes.

### Step 02: SDK-Based Agent

Files:

- [src/02-sdk/run.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/02-sdk/run.js:1)
- [src/02-sdk/README.md](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/02-sdk/README.md:1)
- [src/agents/email-router.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/agents/email-router.js:1)
- [src/ai/model.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/ai/model.js:1)

Command:

```bash
npm run start:02
```

Topics to cover:

- Moving from rule-based logic to an SDK-backed agent
- Prompt design for routers and specialist agents
- Returning machine-readable JSON, not prose
- Model abstraction and fallback behavior
- Why the repo includes a mock model by default

What to emphasize:

- `categorizeEmail` is the control point
- specialist agents have narrow responsibilities
- the offline fallback keeps the workshop runnable without API keys

Slide angle:

- "Replace heuristics with structured inference"
- "Prompting is part of the interface contract"

### Step 03: Orchestration Across Many Emails

Files:

- [src/03-orchestrator/run.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/03-orchestrator/run.js:1)
- [src/examples/emails.json](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/examples/emails.json:1)

Command:

```bash
npm run start:03
```

Topics to cover:

- Processing a batch instead of one message
- Collecting aggregate stats
- Distinguishing per-item execution from orchestration logic
- Where concurrency, queues, retries, and rate limits would appear in a real system

Suggested slide sequence:

- one email vs many emails
- per-email agent execution
- orchestration layer collecting results and metrics

Main teaching point:

Multi-agent systems are often simple loops plus good boundaries, not necessarily complex frameworks.

### Step 04: n8n Integration

Files:

- [src/04-n8n/README.md](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/04-n8n/README.md:1)
- [src/04-n8n/EmailRouter.node.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/04-n8n/EmailRouter.node.js:1)
- [src/04-n8n/AgentReliability.node.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/04-n8n/AgentReliability.node.js:1)
- [src/04-n8n/print-instructions.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/04-n8n/print-instructions.js:1)

Commands:

```bash
npm run start:04
npm run start:n8n
```

Topics to cover:

- Why agent runtimes should be embeddable in existing workflows
- Turning internal agent logic into reusable n8n nodes
- Input normalization and output shaping for workflow tools
- Local staging of custom nodes
- Why integration surfaces matter as much as model quality

Important demo story:

- `Email Router` node triages incoming emails
- `Agent Reliability Monitor` node summarizes how reliable each agent has been
- n8n becomes the operational layer that connects agent behavior with business automation

Slides should include:

- a workflow diagram with Trigger -> Email Router -> downstream branch -> Agent Reliability Monitor
- one slide explaining why custom workflow nodes are safer than pointing n8n at an arbitrary linked package tree

### Step 05: Security and Observability

Files:

- [src/05-security-observability/observability.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/05-security-observability/observability.js:1)
- [src/05-security-observability/run.js](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/05-security-observability/run.js:1)
- [src/05-security-observability/trace.jsonl](/Users/paulcodiny/Projects/2026-02-28-holyjs-workshop/src/05-security-observability/trace.jsonl:1)

Command:

```bash
npm run start:05
```

Topics to cover:

- Prompt injection as a practical risk, not just a theory problem
- Guardrails before model execution
- Per-agent tracing: router, specialist agent, and security guard
- Reliability metrics: success rate, failures, blocked runs, latency
- Why observability is required for production trust

Important framing:

- Security here is intentionally simple and teachable
- The point is the control-plane pattern: inspect, block, trace, summarize
- Observability is not just logs; it is data that supports decisions

Suggested slide:

- a JSONL trace example annotated with what each event means

## Presenter Notes

### Keep repeating these ideas

- Small, explicit agents are easier to operate than big vague ones
- Structured JSON is a reliability tool
- A runtime is mostly coordination, policy, and observability
- Node.js is the control plane, not the intelligence itself
- Production readiness starts with guardrails and traces

### Suggested live-demo order

1. Run `start:01` and show the baseline
2. Run `start:02` and compare behavior
3. Run `start:03` and discuss orchestration
4. Run `start:04` then `start:n8n` and show the workflow nodes
5. Run `start:05` and connect it back to the n8n reliability node

### If time runs short

Trim in this order:

1. shorten deep theory on memory and planner internals
2. keep step 01 brief
3. spend more time on steps 04 and 05 because they are the most "production" parts

## Slide Preparation Checklist

The person preparing slides should make sure the deck contains:

- one end-to-end architecture diagram for the whole workshop
- one slide per step with code references and command to run
- one slide explaining `task`, `event`, and `no_action`
- one slide on offline fallback and mock models
- one slide on runtime building blocks: planner, memory, tools, policy, tracer
- one slide on prompt injection and guardrails
- one slide on reliability metrics in n8n
- one final slide with "from demo agent to production control plane"
