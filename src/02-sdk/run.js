import {
  classifyEmailAgent,
  createAgendaItemAgent,
  createNoActionResult,
  createTaskAgent
} from './agents.js';
import { SAMPLE_EMAIL } from './email-input.js';
import { resolveModel } from './model-resolver.js';

async function main() {
  const { reason } = resolveModel();
  if (reason) {
    console.log(reason);
  }

  const classification = await classifyEmailAgent({ email: SAMPLE_EMAIL });
  let result;

  if (classification.category === 'task') {
    result = await createTaskAgent({ email: SAMPLE_EMAIL, classification });
  } else if (classification.category === 'event') {
    result = await createAgendaItemAgent({ email: SAMPLE_EMAIL, classification });
  } else {
    result = await createNoActionResult({ email: SAMPLE_EMAIL });
  }

  console.log('Classification:', classification);
  console.log('Result:', result);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
