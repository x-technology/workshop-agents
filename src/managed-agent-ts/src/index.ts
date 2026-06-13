/**
 * index.ts — Programmatic usage example.
 *
 * Shows the full lifecycle:
 *  1. Run a task (creates a new session with repo mounted)
 *  2. Resume the same session with a follow-up prompt
 *
 * Run with: npm run dev
 */

import "dotenv/config";
import { runTask } from "./session.js";

const agentId = process.env.AGENT_ID!;
const environmentId = process.env.ENVIRONMENT_ID!;
const githubRepoUrl = process.env.GITHUB_REPO_URL!;
const githubToken = process.env.GITHUB_TOKEN!;

// ── Task 1: Initial request ───────────────────────────────────────────────────
console.log("=== Task 1: Explore repo ===\n");

const result1 = await runTask({
  agentId,
  environmentId,
  githubRepoUrl,
  githubToken,
  prompt: "List the top-level files and folders in this repo and summarize what the project does.",
  onText: (t) => process.stdout.write(t),
  onToolUse: (name) => console.log(`\n🔧 ${name}`),
});

console.log(`\n\n--- Session: ${result1.sessionId} ---\n`);

// ── Task 2: Follow-up in the same session (repo already cloned, context kept) ─
console.log("=== Task 2: Follow-up ===\n");

const result2 = await runTask({
  agentId,
  environmentId,
  githubRepoUrl,
  githubToken,
  prompt: "Now find any TODO comments in the codebase and create a GitHub issue listing them.",
  // Reuse the session — repo stays mounted, conversation history is preserved
  sessionId: result1.sessionId,
  onText: (t) => process.stdout.write(t),
  onToolUse: (name) => console.log(`\n🔧 ${name}`),
});

console.log(`\n\n✅ All done — final status: ${result2.status}`);
