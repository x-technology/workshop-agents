# Claude Managed Agent — TypeScript + GitHub

Run Claude agents hosted on **Anthropic's infrastructure** with access to a GitHub repository.
No server required — Anthropic manages the sandboxed VM where the agent runs.

## How it works

```
Your code                    Anthropic-hosted
─────────────                ──────────────────────────────────
runTask(prompt)  ──POST──▶   Session sandbox (isolated VM)
                             ├── GitHub repo cloned at /workspace/repo
                             ├── Agent loop (Claude Opus)
                             └── Tools: Read, Write, Bash, GitHub MCP...
                 ◀─stream──  Events: text, tool_use, status_idle
```

All execution happens on Anthropic's infrastructure. You only pay per token.

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPO_URL
```

### 2. Get a GitHub token

Create a fine-grained PAT at https://github.com/settings/tokens with:
- **Repository access**: your target repo
- **Permissions**: `Contents: Read & Write`, `Pull requests: Read & Write`

### 3. Create agent + environment (once)

```bash
npm run setup
```

Copy the printed `AGENT_ID` and `ENVIRONMENT_ID` into `.env`.

### 4. Run a task

```bash
npm run task -- "Find all TODO comments and summarize them"
npm run task -- "Fix the type error in src/utils.ts and open a PR"
npm run task -- "Write unit tests for the auth module"
```

Or use programmatically:

```bash
npm run dev   # runs src/index.ts
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | From platform.claude.com |
| `GITHUB_TOKEN` | ✅ | Fine-grained PAT with repo access |
| `GITHUB_REPO_URL` | ✅ | e.g. `https://github.com/org/repo` |
| `AGENT_ID` | ✅ (after setup) | From `npm run setup` |
| `ENVIRONMENT_ID` | ✅ (after setup) | From `npm run setup` |

---

## Key concepts

### Agent (create once, reuse forever)
Defines model, system prompt, tools, and MCP servers. Versioned — update
without breaking existing sessions.

### Environment (create once)
The cloud sandbox configuration: network access, env vars, setup scripts.

### Session (one per task or conversation)
An agent instance with a mounted GitHub repo. Maintains conversation
history so you can send follow-up messages to the same session.

### Events
- **Send**: `user.message` to give the agent a task
- **Receive**: `agent.text`, `agent.tool_use`, `session.status_idle`
- **Confirm**: `user.tool_confirmation` if a tool needs approval

---

## Extending

### Mount multiple repos

```typescript
resources: [
  {
    type: "github_repository",
    url: "https://github.com/org/frontend",
    mount_path: "/workspace/frontend",
    authorization_token: githubToken,
  },
  {
    type: "github_repository",
    url: "https://github.com/org/backend",
    mount_path: "/workspace/backend",
    authorization_token: githubToken,
  },
]
```

### Require human approval for dangerous tools

In `session.ts`, change the `requires_action` handler:

```typescript
case "requires_action":
  const confirmed = await askHuman(toolName); // your UI
  await beta.sessions.events.send(sessionId, {
    events: [{
      type: "user.tool_confirmation",
      tool_use_id: id,
      result: confirmed ? "allow" : "deny",
      deny_message: "User declined",
    }]
  });
```

### Use with Discord bot

In `src/agent/handler.ts` from the discord-claude-agent project,
replace the Agent SDK `query()` call with `runTask()` from this package.
The Discord bot becomes a thin relay — all agent execution stays on Anthropic.

---

## Docs

- [Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview)
- [Agent setup](https://platform.claude.com/docs/en/managed-agents/agent-setup)
- [Sessions](https://platform.claude.com/docs/en/managed-agents/sessions)
- [GitHub access](https://platform.claude.com/docs/en/managed-agents/github)
- [Event streaming](https://platform.claude.com/docs/en/managed-agents/events-and-streaming)
