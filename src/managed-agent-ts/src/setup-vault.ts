/**
 * setup-vault.ts — Create a vault and store the GitHub token credential.
 *
 * Run ONCE after setup, then add VAULT_ID to your .env.
 *
 * Usage:
 *   npm run setup-vault
 */

import "dotenv/config";
import { client } from "./client.js";

if (!process.env.GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

const beta = (client as any).beta;

const vault = await beta.vaults.create({
  display_name: "GitHub MCP credentials",
});

await beta.vaults.credentials.create(vault.id, {
  display_name: "GitHub PAT for MCP",
  auth: {
    type: "static_bearer",
    token: process.env.GITHUB_TOKEN,
    mcp_server_url: "https://api.githubcopilot.com/mcp/",
  },
});

console.log("=== Add to your .env ===");
console.log(`VAULT_ID=${vault.id}`);
