import Anthropic from "@anthropic-ai/sdk";

/**
 * All Managed Agents requests require the managed-agents-2026-04-01 beta header.
 * The SDK sets it automatically when you use client.beta.*
 */
export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    "anthropic-beta": "managed-agents-2026-04-01",
  },
});
