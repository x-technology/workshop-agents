import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { createTaskAgent } from '../02-sdk/agents.js';

const { NodeConnectionTypes, NodeOperationError } = n8nWorkflow;

function normalizeTaskSimulationInput(payload) {
  const email = payload.email ?? (payload.subject || payload.body || payload.from ? payload : null);
  const category =
    payload.classification?.category ??
    payload.result?.classification?.category ??
    payload.category ??
    'task';

  return {
    email,
    category
  };
}

export class TaskSimulation {
  description = {
    displayName: 'Task Simulation Agent',
    name: 'taskSimulation',
    icon: 'file:email-router.svg',
    group: ['transform'],
    version: 1,
    description: 'Simulate task creation for emails classified as task',
    defaults: {
      name: 'Task Simulation Agent'
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
      const { email, category } = normalizeTaskSimulationInput(payload);

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

      if (category !== 'task') {
        const error = new NodeOperationError(
          this.getNode(),
          'Task Simulation Agent only supports task category',
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
        const result = await createTaskAgent({
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
