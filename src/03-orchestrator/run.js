import { SAMPLE_EMAIL } from '../02-sdk/email-input.js';
import { routeEmail } from './email-router.js';

function readSingleEmail() {
  const raw = process.env.ORCHESTRATOR_EMAIL_JSON;
  if (!raw) return SAMPLE_EMAIL;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    throw new Error('ORCHESTRATOR_EMAIL_JSON must contain valid JSON.');
  }

  throw new Error('ORCHESTRATOR_EMAIL_JSON must contain one email object.');
}

async function main() {
  const email = readSingleEmail();
  const routed = await routeEmail(email);

  console.log('Input email:', email);
  console.log('Classification:', routed.classification);
  console.log('Result:', routed.result);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
