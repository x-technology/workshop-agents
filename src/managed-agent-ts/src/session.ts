/**
 * session.ts — Core session management for Managed Agents.
 *
 * Handles:
 *  - Creating a session with a GitHub repo mounted
 *  - Sending a task prompt
 *  - Streaming events back (tool calls, text output, status changes)
 *  - Resuming existing sessions
 */

import { client } from "./client.js";

export interface RunTaskOptions {
  agentId: string;
  environmentId: string;
  githubRepoUrl: string;
  githubToken: string;
  prompt: string;
  /** Optional: resume an existing session instead of creating a new one */
  sessionId?: string;
  /** Vault IDs supplying MCP credentials (e.g. GitHub token) */
  vaultIds?: string[];
  /** Called with each line of streamed agent output */
  onText?: (text: string) => void;
  /** Called when the agent uses a tool */
  onToolUse?: (toolName: string, input: unknown) => void;
  /** Called with the tool output after execution */
  onToolResult?: (toolName: string, output: string, isError: boolean) => void;
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return String(content ?? "");
  return (content as Array<{ type: string; text?: string }>)
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

export interface TaskResult {
  sessionId: string;
  status: string;
  output: string;
}

/**
 * Run a task against a GitHub repo using Anthropic Managed Agents.
 * Anthropic hosts the agent — no server needed on your end.
 */
export async function runTask(opts: RunTaskOptions): Promise<TaskResult> {
  const {
    agentId,
    environmentId,
    githubRepoUrl,
    githubToken,
    prompt,
    vaultIds,
    onText,
    onToolUse,
    onToolResult,
  } = opts;

  const beta = (client as any).beta;

  // ── 1. Create or reuse session ────────────────────────────────────────────
  let sessionId = opts.sessionId;

  if (!sessionId) {
    console.log("  Creating session with GitHub repo mounted...");
    console.log("github_repository", githubRepoUrl);
    console.log("githubToken", githubToken.slice(0, 4) + "…");

    const session = await beta.sessions.create({
      agent: agentId,
      environment_id: environmentId,
      resources: [
        {
          type: "github_repository",
          url: githubRepoUrl,
          mount_path: "/workspace/repo",
          authorization_token: githubToken,
        },
      ],
      ...(vaultIds?.length ? { vault_ids: vaultIds } : {}),
    });

    sessionId = session.id;
    console.log(`  Session: ${sessionId}`);
  } else {
    console.log(`  Resuming session: ${sessionId}`);
  }

  // ── 2. Send the task as a user message ────────────────────────────────────
  await beta.sessions.events.send(sessionId, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: prompt }],
      },
    ],
  });

  // ── 3. Stream events until the session goes idle ──────────────────────────
  let fullOutput = "";
  let finalStatus = "unknown";
  const toolNames = new Map<string, string>(); // tool_use_id → name

  const stream = await beta.sessions.events.stream(sessionId);

  for await (const event of stream) {
    console.log(`  [event] ${event.type}`, JSON.stringify(event));
    switch (event.type) {
      // Agent produced a text block
      case "agent.text":
        fullOutput += event.text;
        onText?.(event.text);
        break;

      // Agent used a built-in tool (Bash, Read, Edit, etc.)
      case "agent.tool_use":
        toolNames.set(event.id, event.name);
        onToolUse?.(event.name, event.input);
        break;

      // Agent used an MCP tool (GitHub: create_pr, push_branch, etc.)
      case "agent.mcp_tool_use":
        toolNames.set(event.id, `mcp:${event.name}`);
        onToolUse?.(`mcp:${event.name}`, event.input);
        break;

      // Result of a built-in tool execution
      case "agent.tool_result":
        onToolResult?.(toolNames.get(event.tool_use_id) ?? event.tool_use_id, extractText(event.content), event.is_error ?? false);
        break;

      // Result of an MCP tool execution
      case "agent.mcp_tool_result":
        onToolResult?.(toolNames.get(event.mcp_tool_use_id) ?? `mcp:${event.mcp_tool_use_id}`, extractText(event.content), event.is_error ?? false);
        break;

      // Session changed status (running → idle, error, etc.)
      case "session.status_idle":
        finalStatus = event.stop_reason?.type ?? "idle";

        // If the session requires confirmation for a tool, auto-allow it.
        // Change to "deny" + deny_message if you want human approval.
        if (event.stop_reason?.type === "requires_action") {
          const eventIds: string[] = event.stop_reason.event_ids ?? [];
          for (const id of eventIds) {
            await beta.sessions.events.send(sessionId, {
              events: [
                {
                  type: "user.tool_confirmation",
                  tool_use_id: id,
                  result: "allow",
                },
              ],
            });
          }
        }
        break;

      // Session-level error
      case "session.error":
        console.error("Session error:", event.error);
        finalStatus = "error";
        break;

      default:
        // span.start, span.end, session.status_running, etc. — safe to ignore
        break;
    }

    // Stop streaming when the turn is complete
    if (
      event.type === "session.status_idle" &&
      event.stop_reason?.type === "end_turn"
    ) {
      break;
    }
  }

  return { sessionId, status: finalStatus, output: fullOutput };
}
