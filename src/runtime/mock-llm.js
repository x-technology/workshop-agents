import path from 'node:path';
import { fileURLToPath } from 'node:url';

const samplePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../examples/sample.txt'
);

// Mocked planner output to keep the workshop offline.
// Replace with a real LLM provider when needed.

export function mockLLM({ task, input, toolNames }) {
  const steps = [];

  if (input.includes('summary')) {
    steps.push({ tool: 'summarize', args: { text: input } });
  } else if (input.includes('file')) {
    steps.push({ tool: 'readFile', args: { path: samplePath } });
    steps.push({ tool: 'summarize', args: { text: '$last' } });
  } else if (input.includes('search')) {
    steps.push({ tool: 'httpGet', args: { url: 'https://example.com' } });
  } else {
    steps.push({ tool: 'echo', args: { text: input } });
  }

  return { steps, tools: toolNames, rationale: 'Mocked plan' };
}
