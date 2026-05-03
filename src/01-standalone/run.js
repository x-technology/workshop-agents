import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTrace } from '../runtime/tracer.js';
import {
  createJsonCompletion,
  resolveOpenAICompatibleConfig
} from '../runtime/openai-compatible.js';

const tracePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  './trace.jsonl'
);

const tracer = createTrace({ logPath: tracePath });

const emails = [
  {
    id: 'email-1',
    from: 'ceo@company.com',
    subject: 'Please review the Q1 roadmap',
    body: 'Can you review the Q1 roadmap and send feedback by Friday?'
  },
  {
    id: 'email-2',
    from: 'hr@company.com',
    subject: 'Team sync tomorrow',
    body: 'Inviting you to a team sync meeting tomorrow at 10:00 via Zoom.'
  },
  {
    id: 'email-3',
    from: 'newsletter@product.com',
    subject: 'Weekly digest',
    body: 'Here are the latest updates from the product team.'
  }
];

const routeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: ['task', 'event', 'no_action']
    },
    reason: {
      type: 'string'
    }
  },
  required: ['category', 'reason']
};

function naiveCategorize(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  if (text.includes('meeting') || text.includes('invite') || text.includes('calendar')) {
    return {
      category: 'event',
      reason: 'Keyword fallback matched meeting/invite/calendar language.'
    };
  }
  if (text.includes('please') || text.includes('review') || text.includes('action')) {
    return {
      category: 'task',
      reason: 'Keyword fallback matched task-oriented language.'
    };
  }
  return {
    category: 'no_action',
    reason: 'Keyword fallback found no task or event signals.'
  };
}

async function routeWithLlm(email) {
  const runId = tracer.startRun({
    agent: '01-standalone',
    emailId: email.id
  });

  try {
    const result = await createJsonCompletion({
      system:
        'You classify incoming emails into exactly one of three categories: task, event, or no_action. ' +
        'task means someone is asking for work, follow-up, or a deliverable. ' +
        'event means the email is about a meeting, calendar invite, or scheduled gathering. ' +
        'no_action means informational content that does not require direct action. ' +
        'Return compact JSON only.',
      user: JSON.stringify(email),
      schema: routeSchema,
      schemaName: 'email_route'
    });

    tracer.endRun(runId, { status: 'ok', result });
    return result;
  } catch (error) {
    tracer.endRun(runId, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

function routeWithFallback(email) {
  const runId = tracer.startRun({
    agent: '01-standalone',
    emailId: email.id,
    mode: 'fallback'
  });

  try {
    const result = naiveCategorize(email);
    tracer.endRun(runId, { status: 'ok', result });
    return result;
  } catch (error) {
    tracer.endRun(runId, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function main() {
  const config = resolveOpenAICompatibleConfig();
  const shouldUseLlm = Boolean(config.apiKey);

  if (shouldUseLlm) {
    console.log(`Using model: ${config.model}`);
  } else {
    console.log('OPENAI_API_KEY is not set. Falling back to naive keyword categorization.');
  }

  for (const email of emails) {
    const routed = shouldUseLlm ? await routeWithLlm(email) : routeWithFallback(email);
    console.log(`[${email.id}] -> ${routed.category} (${routed.reason})`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
