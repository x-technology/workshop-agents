# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install           # install dependencies
npm start             # run agent.ts via tsx
npm run dev           # run with file-watching
npx tsx agent.ts      # run a specific agent file directly
```

Docker:
```bash
docker build -t agent-sdk .
docker run -e ANTHROPIC_API_KEY=sk-... agent-sdk
```

## Architecture

This project uses the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for TypeScript to build autonomous AI agents. The SDK wraps Claude Code's tool-execution engine — agents run an agentic loop where Claude reads a prompt, calls tools (Read, Edit, Glob, Bash, etc.), observes results, and iterates until the task is complete.

### Core pattern

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "...",
  options: {
    allowedTools: ["Read", "Edit", "Glob"],
    permissionMode: "acceptEdits"
  }
})) {
  // message.type === "assistant" | "result" | "system" | "user"
}
```

`query()` returns an async iterator streaming messages as Claude works. The SDK handles tool orchestration internally; the caller just consumes the stream.

### Permission modes

| Mode | Behavior |
|---|---|
| `acceptEdits` | Auto-approves file edits; prompts for other actions |
| `dontAsk` | Denies anything not in `allowedTools` |
| `bypassPermissions` | No prompts — for sandboxed CI/Docker environments |
| `auto` | Model classifier approves/denies each tool call |

### Authentication

Set `ANTHROPIC_API_KEY` in the environment or a `.env` file. For cloud providers: `CLAUDE_CODE_USE_BEDROCK=1`, `CLAUDE_CODE_USE_VERTEX=1`, or `CLAUDE_CODE_USE_FOUNDRY=1`.

The SDK bundles a platform-specific Claude Code binary as an optional npm dependency — no separate Claude Code install required. In Docker (Linux), `npm install` automatically pulls the Linux binary.
