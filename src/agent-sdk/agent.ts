import { query } from "@anthropic-ai/claude-agent-sdk";

const prompt = process.argv[2] ?? "Summarize what we've done so far.";
console.log(prompt)

for await (const message of query({
  prompt,
  options: {
    allowedTools: ["Read", "Glob", "Grep"],
    permissionMode: "acceptEdits",
    continue: true
  },
})) {
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) {
        process.stdout.write(block.text);
      } else if ("name" in block) {
        console.log(`\n[Tool: ${block.name}]`);
      }
    }
  } else if (message.type === "result") {
    console.log(`\n[Done: ${message.subtype}]`);
  }
}
