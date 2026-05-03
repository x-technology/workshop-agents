import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { classifyEmailAgent } from '../02-sdk/agents.js';

const { NodeConnectionTypes, NodeOperationError } = n8nWorkflow;

function normalizePayload(payload) {
  if (payload.email) return payload.email;
  if (payload.subject || payload.body || payload.from) return payload;
  return null;
}

export class EmailClassification {
  description = {
    displayName: 'Email Classification Agent',
    name: 'emailClassification',
    icon: 'file:email-router.svg',
    group: ['transform'],
    version: 1,
    description: 'Classify emails as task, event, or no_action using the step 02 ADK agent',
    defaults: {
      name: 'Email Classification Agent'
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: []
  };

  async execute() {
    const items = this.getInputData();
    const outputItems = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const payload = items[itemIndex].json ?? {};
      const email = normalizePayload(payload);

      if (!email) {
        const error = new NodeOperationError(this.getNode(), 'No email payload found on item', {
          itemIndex
        });

        if (this.continueOnFail()) {
          outputItems.push({
            json: { error: error.message },
            pairedItem: { item: itemIndex }
          });
          continue;
        }

        throw error;
      }

      try {
        const classification = await classifyEmailAgent({ email });
        outputItems.push({
          json: {
            email,
            classification
          },
          pairedItem: { item: itemIndex }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (this.continueOnFail()) {
          outputItems.push({
            json: { email, error: message },
            pairedItem: { item: itemIndex }
          });
          continue;
        }

        throw new NodeOperationError(this.getNode(), message, { itemIndex });
      }
    }

    return [outputItems];
  }
}
