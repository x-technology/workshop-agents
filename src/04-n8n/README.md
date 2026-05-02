# n8n custom node

This step ships minimal n8n custom nodes for email routing and reliability monitoring. The main node wraps the router, and the monitor node summarizes per-agent health from the observability trace.

## What you get

- `EmailRouter.node.js` – the node implementation
- `AgentReliability.node.js` – the reliability summary node
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

For each email, it outputs an item with:

```json
{ "email": { /* original email */ }, "result": { /* routeEmail output */ } }
```

## Local dev setup

1. Run `npm run start:04` from the repo root.
2. That creates `.n8n/custom/EmailRouter.node.js`, `.n8n/custom/AgentReliability.node.js`, and copies the icon into `.n8n/custom/`.
3. Start n8n with `npm run start:n8n`.
4. Add the “Email Router” and “Agent Reliability Monitor” nodes to your workflow.

## Notes

- This package intentionally keeps the code small and workshop-friendly.
- The staged custom node file re-exports `EmailRouter` from `src/04-n8n/EmailRouter.node.js`.
- The staged custom node file also re-exports `AgentReliability` from `src/04-n8n/AgentReliability.node.js`.
- The node routes emails through `src/05-security-observability/observability.js`, which reuses the step 03 router and action agents.
- Reliability traces are written to `src/05-security-observability/trace.jsonl` by default.

## Suggested workflow

1. Trigger with a Manual Trigger, Webhook, or test payload.
2. Send email JSON into `Email Router`.
3. Leave `Write Reliability Trace` enabled so each router/specialist run is appended to the trace log.
4. Feed a later branch into `Agent Reliability Monitor` to read the trace and emit one item per agent with:
   - success and failure counts
   - blocked prompt injection counts
   - average latency
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
