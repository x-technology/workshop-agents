import { FunctionTool, LlmAgent, LLMRegistry, InMemoryRunner, stringifyContent, getFunctionCalls } from '@google/adk';
import { z } from 'zod';
import { ClaudeLlm } from './claude-llm.js';
import { resolvePrompt } from './lib/prompt.js';

/* Register Claude LLM with ADK */
LLMRegistry.register(ClaudeLlm);

/* Mock tool implementation */
const getCurrentTime = new FunctionTool({
  name: 'get_current_time',
  description: 'Returns the current time in a specified city.',
  parameters: z.object({
    city: z.string().describe("The name of the city for which to retrieve the current time."),
  }),
  execute: ({ city }) => {
    return { status: 'success', report: `The current time in ${city} is 10:30 AM` };
  },
});

export const rootAgent = new LlmAgent({
  name: 'hello_time_agent',
  model: 'claude-sonnet-4-6',
  description: 'Tells the current time in a specified city.',
  instruction: `You are a helpful assistant that tells the current time in a city.
                Use the 'getCurrentTime' tool for this purpose.`,
  tools: [getCurrentTime],
});

const prompt = resolvePrompt(process.argv[2]);
if (!prompt) {
  console.error('Please provide a prompt as a command-line argument.');
  process.exit(0);
}

const runner = new InMemoryRunner({ agent: rootAgent, appName: 'hello_time_agent' });

for await (const event of runner.runEphemeral({
  userId: 'user1',
  newMessage: { role: 'user', parts: [{ text: prompt }] },
})) {
  if (event.errorCode || event.errorMessage) {
    console.error(`\n[Error ${event.errorCode ?? ''}] ${event.errorMessage ?? ''}`);
    continue;
  }
  for (const call of getFunctionCalls(event)) {
    console.log(`\n[Tool: ${call.name}]`);
  }
  const text = stringifyContent(event);
  if (text) {
    process.stdout.write(text);
  }
}