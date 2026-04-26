import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { summarizeReliability } from '../05-security-observability/observability.js';

const { NodeConnectionTypes, NodeOperationError } = n8nWorkflow;

export class AgentReliability {
  description = {
    displayName: 'Agent Reliability Monitor',
    name: 'agentReliability',
    icon: 'file:email-router.svg',
    group: ['transform'],
    version: 1,
    description: 'Summarize per-agent reliability and latency from the observability trace',
    defaults: {
      name: 'Agent Reliability Monitor'
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      {
        displayName: 'Trace Path',
        name: 'tracePath',
        type: 'string',
        default: '',
        placeholder: 'src/05-security-observability/trace.jsonl',
        description: 'Optional absolute or repo-relative path for the trace log'
      }
    ]
  };

  async execute() {
    const items = this.getInputData();
    const itemIndex = items.length > 0 ? 0 : 0;
    const tracePath = this.getNodeParameter('tracePath', itemIndex);

    try {
      const summary = summarizeReliability(tracePath);
      const pairedItem = items.length > 0 ? { item: 0 } : undefined;

      return [summary.agents.map(agent => ({
        json: {
          ...agent,
          tracePath: summary.tracePath,
          generatedAt: summary.generatedAt,
          totalEvents: summary.totalEvents,
          totalEmails: summary.totalEmails
        },
        ...(pairedItem ? { pairedItem } : {})
      }))];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new NodeOperationError(this.getNode(), message, { itemIndex });
    }
  }
}
