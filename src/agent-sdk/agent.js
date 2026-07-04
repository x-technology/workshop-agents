import { query } from "@anthropic-ai/claude-agent-sdk";
import { resolvePrompt } from "./lib/prompt.js";

const prompt = resolvePrompt(process.argv[2]);
console.log(prompt)

for await (const message of query({
  prompt,
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    // permissionMode: "acceptEdits",
    permissionMode: "dontAsk",
    continue: true
  },
})) {
  if (message.type === 'assistant' && message.message?.content) {
    for (const block of message.message.content) {
      if ('text' in block) {
        process.stdout.write(block.text);
      } else if ('name' in block) {
        console.log(`\n[Tool: ${block.name}]`);
      }
    }
  } else if (message.type === 'result') {
    console.log(`\n[Done: ${message.subtype}]`);
  }
}
