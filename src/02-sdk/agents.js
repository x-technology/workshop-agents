import { categorizeEmailWithAdk } from './adk-runner.js';
import { fallbackClassification } from './fallback.js';
import { resolveModel } from './model-resolver.js';

function getResolvedModel() {
  const { model } = resolveModel();
  return model;
}

export async function classifyEmailAgent({ email }) {
  const model = getResolvedModel();
  if (!model) {
    return fallbackClassification(email);
  }

  return categorizeEmailWithAdk({ email, model });
}
