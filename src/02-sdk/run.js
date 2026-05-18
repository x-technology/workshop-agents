import { classifyEmailAgent } from './agents.js';
import { SAMPLE_EMAIL } from './email-input.js';
import { resolveModel } from './model-resolver.js';

async function main() {
  const { reason } = resolveModel();
  if (reason) {
    console.log(reason);
  }

  const classification = await classifyEmailAgent({ email: SAMPLE_EMAIL });
  console.log('Classification:', classification);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
