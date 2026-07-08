/**
 * setup.ts — Run ONCE to create your agent and cloud environment.
 * Copy the printed IDs into your .env as AGENT_ID and ENVIRONMENT_ID.
 *
 * Usage:
 *   npm run setup
 */

import "dotenv/config";
import { client } from "./client.js";

async function setup() {
  console.log("=== Managed Agent Setup ===\n");

  // ── 1. Create the agent ────────────────────────────────────────────────────
  console.log("Creating agent...");
  console.log((client as any).beta.agents);
  const agent = await (client as any).beta.agents.create({
    name: "GitHub Coding Assistant",
    model: { id: "claude-sonnet-4-6" },
    system: `You are a helpful coding agent with access to a GitHub repository.
You can read files, understand code structure, make changes, run tests, and create pull requests.
Always explain what you are doing before doing it.
When making code changes, be conservative and surgical — only change what is necessary.`,

    // GitHub MCP server for PR creation and GitHub API access
    mcp_servers: [
      {
        type: "url",
        name: "github",
        url: "https://api.githubcopilot.com/mcp",
      },
    ],

    // Tools available to the agent
    tools: [
      // Full agent toolset: Read, Write, Edit, Bash, Glob, Grep, WebSearch, etc.
      { type: "agent_toolset_20260401" },
      // GitHub MCP tools: create PRs, branches, issues, etc.
      { type: "mcp_toolset", mcp_server_name: "github" },
    ],
  });

  console.log(`✅ Agent created: ${agent.id} (v${agent.version})\n`);

  // ── 2. Create a cloud environment ─────────────────────────────────────────
  console.log("Creating cloud environment...");
  const environment = await (client as any).beta.environments.create({
    name: "GitHub Workspace",
    // Limited network access by default (npm, PyPI, GitHub, etc. are allowed)
    // config: {
    //   network_access: "limited",
    // },
  });

  // console.log(`✅ Environment created: ${environment.id}\n`);

  // ── 3. Print IDs to save ──────────────────────────────────────────────────
  console.log("=== Save these to your .env ===");
  console.log(`AGENT_ID=${agent.id}`);
  console.log(`ENVIRONMENT_ID=${environment.id}`);
  console.log("\nSetup complete. Run tasks with: npm run task");
}

setup().catch((err) => {
  console.error("Setup failed:", err?.message ?? err);
  process.exit(1);
});
