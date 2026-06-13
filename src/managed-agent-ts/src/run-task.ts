/**
 * run-task.ts — CLI to run a one-off task against your GitHub repo.
 *
 * Usage:
 *   npm run task -- "Find all TODO comments and summarize them"
 *   npm run task -- "Fix the type error in src/utils.ts and create a PR"
 *
 * Set AGENT_ID and ENVIRONMENT_ID in .env after running `npm run setup`.
 */

import "dotenv/config";
import { runTask } from "./session.js";

const prompt = process.argv.slice(2).join(" ").trim();

if (!prompt) {
  console.error('Usage: npm run task -- "your task description"');
  process.exit(1);
}

const required = [
  "ANTHROPIC_API_KEY",
  "GITHUB_TOKEN",
  "GITHUB_REPO_URL",
  "AGENT_ID",
  "ENVIRONMENT_ID",
  "VAULT_ID",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

console.log(`\n🤖 Task: ${prompt}\n`);

let textStarted = false;

const result = await runTask({
  agentId: process.env.AGENT_ID!,
  environmentId: process.env.ENVIRONMENT_ID!,
  githubRepoUrl: process.env.GITHUB_REPO_URL!,
  githubToken: process.env.GITHUB_TOKEN!,
  sessionId: process.env.SESSION_ID,
  vaultIds: [process.env.VAULT_ID!],
  prompt,

  onText: (text) => {
    // Print a header the first time text arrives in this turn
    if (!textStarted) { console.log("\n💬 Response:"); textStarted = true; }
    process.stdout.write(text);
  },

  onToolUse: (toolName, input) => {
    textStarted = false; // reset for next text block after tool use
    const inputStr =
      typeof input === "object"
        ? JSON.stringify(input).slice(0, 80)
        : String(input);
    console.log(`\n🔧 ${toolName}(${inputStr}...)`);
  },

  onToolResult: (toolName, output, isError) => {
    const icon = isError ? "❌" : "  ";
    const preview = output.length > 300 ? output.slice(0, 300) + "…" : output;
    console.log(`${icon}  ↳ ${toolName}: ${preview}`);
  },
});

console.log(`\n\n✅ Done — status: ${result.status}`);
console.log(`   Session ID: ${result.sessionId}`);
console.log(`   (Reuse this session: SESSION_ID=${result.sessionId})`);
