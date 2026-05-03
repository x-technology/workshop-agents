import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { routeEmail } from '../03-orchestrator/email-router.js';

const { NodeConnectionTypes, NodeOperationError } = n8nWorkflow;

function normalizePayload(payload) {
  if (Array.isArray(payload.emails)) return payload.emails;
  if (payload.email) return [payload.email];
  if (payload.subject || payload.body || payload.from) return [payload];
  return [];
}

export class EmailRouter {
  description = {
    displayName: 'Email Router',
    name: 'emailRouter',
    icon: 'file:email-router.svg',
    group: ['transform'],
    version: 1,
    description: 'Classify emails as task, event, or no_action',
    defaults: {
      name: 'Email Router'
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
      const emails = normalizePayload(payload);

      if (emails.length === 0) {
        const error = new NodeOperationError(
          this.getNode(),
          'No email payload found on item',
          { itemIndex }
        );

        if (this.continueOnFail()) {
          outputItems.push({
            json: { error: error.message },
            pairedItem: { item: itemIndex }
          });
          continue;
        }

        throw error;
      }

      for (const email of emails) {
        try {
          const result = await routeEmail(email);

          outputItems.push({
            json: {
              email,
              result
            },
            pairedItem: { item: itemIndex }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          if (this.continueOnFail()) {
            outputItems.push({
              json: {
                email,
                error: message
              },
              pairedItem: { item: itemIndex }
            });
            continue;
          }

          throw new NodeOperationError(this.getNode(), message, { itemIndex });
        }
      }
    }

    return [outputItems];
  }
}
