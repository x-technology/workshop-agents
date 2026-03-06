import { mockLLM } from './mock-llm.js';

export class Planner {
  constructor({ tools }) {
    this.tools = tools;
  }

  async createPlan({ task, input, memory }) {
    const toolNames = Object.keys(this.tools);
    const llmOutput = mockLLM({ task, input, toolNames, memory });

    return {
      task,
      steps: llmOutput.steps
    };
  }
}
