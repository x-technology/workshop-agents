import { runTriageAgent } from './adk-runner.js';
import { SAMPLE_EMAIL } from './email-input.js';
import { fallbackRoute } from './fallback.js';
import { safeJsonParse } from './json.js';
import { resolveModel } from './model-resolver.js';

async function main() {
  const { model, reason } = resolveModel();
  if (!model) {
    console.log(`No model available. Using local fallback classification. ${reason}`);
    const fallback = fallbackRoute(SAMPLE_EMAIL);
    console.log('Classification:', fallback.classification);
    console.log('Result:', fallback.result);
    return;
  }

  const responseText = await runTriageAgent({ email: SAMPLE_EMAIL, model });
  const parsed = safeJsonParse(responseText, fallbackRoute(SAMPLE_EMAIL));
  console.log('Classification:', parsed.classification);
  console.log('Result:', parsed.result);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
