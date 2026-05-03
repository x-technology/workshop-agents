import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { createAgendaItemAgent } from '../02-sdk/agents.js';

const { NodeConnectionTypes, NodeOperationError } = n8nWorkflow;

function normalizeAgendaSimulationInput(payload) {
  const email = payload.email ?? (payload.subject || payload.body || payload.from ? payload : null);
  const category =
    payload.classification?.category ??
    payload.result?.classification?.category ??
    payload.category ??
    'event';

  return {
    email,
    category
  };
}

export class AgendaSimulation {
  description = {
    displayName: 'Agenda Simulation Agent',
    name: 'agendaSimulation',
    icon: 'file:email-router.svg',
    group: ['transform'],
    version: 1,
    description: 'Simulate agenda item creation for emails classified as event',
    defaults: {
      name: 'Agenda Simulation Agent'
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
      const { email, category } = normalizeAgendaSimulationInput(payload);

      if (!email) {
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

      if (category !== 'event') {
        const error = new NodeOperationError(
          this.getNode(),
          'Agenda Simulation Agent only supports event category',
          { itemIndex }
        );

        if (this.continueOnFail()) {
          outputItems.push({
            json: {
              email,
              category,
              error: error.message
            },
            pairedItem: { item: itemIndex }
          });
          continue;
        }

        throw error;
      }

      try {
        const result = await createAgendaItemAgent({
          email,
          classification: { category }
        });

        outputItems.push({
          json: {
            email,
            category,
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
              category,
              error: message
            },
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
