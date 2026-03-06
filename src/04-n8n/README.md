# n8n community node

This step now ships a minimal n8n community node, registered from the root `package.json`, instead of a standalone webhook server. The node wraps `routeEmail` and lets n8n call the router directly inside a workflow.

## What you get

- `EmailRouter.node.js` – the node implementation
- `email-router.svg` – node icon
- root `package.json` – n8n node registration

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

1. Install n8n and create a custom extensions folder.
2. Link this package into n8n so the node shows up in the UI.
3. Restart n8n and add the “Email Router” node to any workflow.

## Notes

- This package intentionally keeps the code small and workshop-friendly.
- The node imports `routeEmail` from `src/agents/email-router.js` in this repo, so it’s intended to be used from this workshop checkout.
