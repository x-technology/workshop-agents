import n8nWorkflow from 'n8n-workflow/dist/cjs/index.js';
import { secureRouteWithMonitor } from '../05-security-observability/observability.js';

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
    properties: [
      {
        displayName: 'Block Prompt Injection',
        name: 'blockPromptInjection',
        type: 'boolean',
        default: true,
        description: 'Reject emails that try to override agent instructions'
      },
      {
        displayName: 'Write Reliability Trace',
        name: 'writeTrace',
        type: 'boolean',
        default: true,
        description: 'Append per-agent execution events to the observability trace file'
      },
      {
        displayName: 'Include Monitor Data',
        name: 'includeMonitor',
        type: 'boolean',
        default: true,
        description: 'Return per-run agent timings and reliability fields in the node output'
      },
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
    const outputItems = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const payload = items[itemIndex].json ?? {};
      const emails = normalizePayload(payload);
      const blockPromptInjection = this.getNodeParameter('blockPromptInjection', itemIndex);
      const writeTrace = this.getNodeParameter('writeTrace', itemIndex);
      const includeMonitor = this.getNodeParameter('includeMonitor', itemIndex);
      const tracePath = this.getNodeParameter('tracePath', itemIndex);

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
          const monitored = await secureRouteWithMonitor(email, {
            blockPromptInjection,
            writeTrace,
            tracePath
          });

          outputItems.push({
            json: {
              email,
              result: monitored.result,
              ...(includeMonitor ? { monitor: monitored.monitor } : {})
            },
            pairedItem: { item: itemIndex }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const monitor = error?.monitor;

          if (this.continueOnFail()) {
            outputItems.push({
              json: {
                email,
                error: message,
                ...(monitor ? { monitor } : {})
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
