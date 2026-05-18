import { classifyEmailAgent } from '../02-sdk/agents.js';
import { createAgendaItemAgent, createNoActionResult, createTaskAgent } from './agents.js';

export async function routeEmail(email) {
  const classification = await classifyEmailAgent({ email });

  if (classification.category === 'task') {
    return {
      classification,
      result: await createTaskAgent({ email, classification }),
    };
  }

  if (classification.category === 'event') {
    return {
      classification,
      result: await createAgendaItemAgent({ email, classification }),
    };
  }

  return {
    classification,
    result: await createNoActionResult({ email }),
  };
}
