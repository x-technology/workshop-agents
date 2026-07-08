import "dotenv/config";
import { client } from "./client.js";

const beta = (client as any).beta;

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");
}

async function streamSessionEvents(sessionId: string): Promise<void> {
  console.log(`  Streaming events for session ${sessionId}...`);
  const stream = await beta.sessions.events.stream(sessionId);
  for await (const event of stream) {
    switch (event.type) {
      case "agent.text":
        console.log(`  [text] ${event.text}`);
        break;

      case "agent.tool_use":
        console.log(`  [tool_use] ${event.name}`, JSON.stringify(event.input));
        break;

      case "agent.tool_result": {
        const output = extractText(event.content);
        const tag = event.is_error ? "[tool_result error]" : "[tool_result]";
        console.log(`  ${tag} ${output}`);
        break;
      }

      case "agent.mcp_tool_use":
        console.log(`  [mcp_tool_use] ${event.mcp_server_name}/${event.name}`, JSON.stringify(event.input));
        break;

      case "agent.mcp_tool_result": {
        const output = extractText(event.content);
        const tag = event.is_error ? "[mcp_tool_result error]" : "[mcp_tool_result]";
        console.log(`  ${tag} ${output}`);
        break;
      }

      case "session.status_idle":
        console.log(`  [idle] stop_reason: ${JSON.stringify(event.stop_reason)}`);
        break;

      case "session.error":
        console.error(`  [error]`, event.error);
        break;

      default:
        // span.* and other housekeeping events — skip
        break;
    }

    if (
      event.type === "session.status_idle" &&
      (event as any).stop_reason?.type === "end_turn"
    ) {
      break;
    }
  }
}

async function cleanAll(): Promise<void> {
  // ── 1. Stream events from and delete all sessions for the configured agent ──
  const agentId = process.env.AGENT_ID;
  if (agentId) {
    console.log(`\nListing sessions for agent ${agentId}...`);
    const sessionTasks: Promise<void>[] = [];

    for await (const session of beta.sessions.list({ agent_id: agentId })) {
      console.log(`Session ${session.id}: ${session.status}`);
      sessionTasks.push(
        streamSessionEvents(session.id).finally(async () => {
          await beta.sessions.delete(session.id);
          console.log(`  Deleted session ${session.id}`);
        })
      );
    }

    await Promise.all(sessionTasks);
  }

  // ── 2. Delete all agents ──────────────────────────────────────────────────
  console.log("\nListing agents...");
  for await (const agent of beta.agents.list()) {
    console.log(`Deleting agent ${agent.id} (${agent.name})...`);
    await beta.agents.delete(agent.id);
    console.log(`  Deleted agent ${agent.id}`);
  }

  // ── 3. Delete all environments ────────────────────────────────────────────
  console.log("\nListing environments...");
  for await (const env of beta.environments.list()) {
    console.log(`Deleting environment ${env.id} (${env.name})...`);
    await beta.environments.delete(env.id);
    console.log(`  Deleted environment ${env.id}`);
  }

  console.log("\nCleanup complete.");
}

cleanAll().catch((err) => {
  console.error("Cleanup failed:", err?.message ?? err);
  process.exit(1);
});
