# n8n custom node

This step ships minimal n8n custom nodes for visual orchestration. The intended flow is: classify email, branch in n8n, then call either task-creation or agenda-item simulation. The reliability monitor remains available as a later add-on.

## What you get

- `EmailRouter.node.js` – convenience wrapper around the step 03 monolith
- `EmailClassification.node.js` – classifies emails with the step 02 agent
- `TaskSimulation.node.js` – simulates task creation for `task` emails
- `AgendaSimulation.node.js` – simulates agenda item creation for `event` emails
- `AgentReliability.node.js` – optional success/error summary node for step `05` traces
- `email-router.svg` – node icon
- `print-instructions.js` – stages a safe `.n8n/custom` folder for n8n to scan

## Inputs and outputs

The node reads each incoming item and accepts any of these payload shapes:

```json
{ "from": "boss@company.com", "subject": "Follow up", "body": "Please schedule a call." }
```

```json
{ "email": { "from": "boss@company.com", "subject": "Follow up", "body": "Please schedule a call." } }
```

```json
{ "emails": [ { "from": "hr@company.com", "subject": "Team sync", "body": "Invite for tomorrow" } ] }
```

`Email Router` outputs one item per email with:

```json
{ "email": { /* original email */ }, "result": { /* routeEmail output */ } }
```

`Email Classification Agent` outputs:

```json
{ "email": { /* original email */ }, "classification": { "category": "task|event|no_action" } }
```

`Task Simulation Agent` and `Agenda Simulation Agent` output:

```json
{ "email": { /* original email */ }, "category": "task|event", "result": { /* simulated specialist output */ } }
```

`Task Simulation Agent` accepts `task` items only. `Agenda Simulation Agent` accepts `event` items only.

## Local dev setup

1. Run `npm run start:04` from the repo root.
2. That creates `.n8n/custom/EmailRouter.node.js`, `.n8n/custom/EmailClassification.node.js`, `.n8n/custom/TaskSimulation.node.js`, `.n8n/custom/AgendaSimulation.node.js`, `.n8n/custom/AgentReliability.node.js`, and copies the icon into `.n8n/custom/`.
3. Start n8n with `npm run start:n8n`.
4. Add the “Email Classification Agent”, “Task Simulation Agent”, “Agenda Simulation Agent”, and optionally “Email Router” / “Agent Reliability Monitor” nodes to your workflow.

## Notes

- This package intentionally keeps the code small and workshop-friendly.
- The staged custom node file re-exports `EmailRouter` from `src/04-n8n/EmailRouter.node.js`.
- The staged custom node file also re-exports `EmailClassification` from `src/04-n8n/EmailClassification.node.js`.
- The staged custom node file also re-exports `TaskSimulation` from `src/04-n8n/TaskSimulation.node.js`.
- The staged custom node file also re-exports `AgendaSimulation` from `src/04-n8n/AgendaSimulation.node.js`.
- The staged custom node file also re-exports `AgentReliability` from `src/04-n8n/AgentReliability.node.js`.
- The step 04 nodes reuse the step 02 agents directly, or the step 03 router in the `Email Router` shortcut node.
- `Agent Reliability Monitor` does not add observability by itself. It only reads traces written by the step `05` wrappers.

## Suggested workflow

1. Trigger with a Manual Trigger, Webhook, or test payload.
2. Send email JSON into `Email Classification Agent`.
3. Add an IF/Switch node in n8n and branch on `classification.category`.
4. Route `task` items into `Task Simulation Agent`.
5. Route `event` items into `Agenda Simulation Agent`.
6. Keep `Email Router` only as a shortcut when you want the step 03 monolith behavior inside n8n.
7. Feed a later branch into `Agent Reliability Monitor` to read the trace and emit one item per agent with:
   - success and failure counts
   - reliability ratio

## Steps to execute

```bash
npm run start:n8n
```

To stage the custom node locally:

```bash
npm run start:04
npm run start:n8n
```

## Troubleshooting

`N8N_CUSTOM_EXTENSIONS` is a raw scan directory, not a package loader. n8n
recursively loads every `**/*.node.js` file it finds inside that directory.

Do not point it at a linked package with a `node_modules` tree inside. If you do
that, n8n will try to load dependency files such as `pkce-challenge/dist/index.node.js`
as workflow nodes and fail during startup.

`npm run start:n8n` avoids this by forcing `N8N_USER_FOLDER` to the repository
root, so n8n uses this repo's `.n8n/custom` folder as its built-in custom
extension directory and does not scan `~/.n8n/custom`.

If you already hit that problem, remove the linked custom package and restage
the local scan directory:

```bash
rm -rf "$HOME/.n8n/custom/node_modules/holyjs-agent-runtime-workshop"
npm run start:04
npm run start:n8n
```
