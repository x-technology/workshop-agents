import { createTrace } from './tracer.js';
import { enforcePolicy } from './policy.js';

export class AgentRuntime {
  constructor({ name, planner, memory, tools, policy, tracer }) {
    this.name = name;
    this.planner = planner;
    this.memory = memory;
    this.tools = tools;
    this.policy = policy;
    this.tracer = tracer || createTrace();
  }

  async run(task, input) {
    const runId = this.tracer.startRun({ agent: this.name, task });
    try {
      this.memory.shortTerm.push({ role: 'user', content: input });

      const plan = await this.planner.createPlan({ task, input, memory: this.memory });
      this.tracer.log(runId, 'plan.created', { steps: plan.steps.length });

      let result = null;
      for (const step of plan.steps) {
        const spanId = this.tracer.startSpan(runId, 'tool.execute', {
          tool: step.tool,
          args: step.args
        });

        enforcePolicy({
          agent: this.name,
          tool: step.tool,
          policy: this.policy,
          args: step.args
        });

        const toolFn = this.tools[step.tool];
        if (!toolFn) {
          throw new Error(`Tool not found: ${step.tool}`);
        }

        result = await toolFn(step.args, { memory: this.memory, tracer: this.tracer, runId });
        this.tracer.endSpan(runId, spanId, { result });

        this.memory.shortTerm.push({ role: 'tool', content: { tool: step.tool, result } });
      }

      this.memory.shortTerm.push({ role: 'assistant', content: result });
      this.tracer.endRun(runId, { status: 'ok', result });
      return result;
    } catch (err) {
      this.tracer.endRun(runId, { status: 'error', error: err.message });
      throw err;
    }
  }
}
