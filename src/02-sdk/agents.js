import {
  categorizeEmailWithAdk,
  runAgendaItemSimulationAgent,
  runTaskCreationSimulationAgent
} from './adk-runner.js';
import {
  fallbackAgendaItemSimulation,
  fallbackClassification,
  fallbackNoActionSimulation,
  fallbackTaskSimulation,
  normalizeClassification
} from './fallback.js';
import { safeJsonParse } from './json.js';
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

export async function createTaskAgent({ email, classification }) {
  const normalized = normalizeClassification(classification, email);
  const model = getResolvedModel();
  const fallback = fallbackTaskSimulation(email, normalized);

  if (!model) {
    return fallback;
  }

  const responseText = await runTaskCreationSimulationAgent({
    email,
    classification: normalized,
    model
  });

  return safeJsonParse(responseText, fallback);
}

export async function createAgendaItemAgent({ email, classification }) {
  const normalized = normalizeClassification(classification, email);
  const model = getResolvedModel();
  const fallback = fallbackAgendaItemSimulation(email, normalized);

  if (!model) {
    return fallback;
  }

  const responseText = await runAgendaItemSimulationAgent({
    email,
    classification: normalized,
    model
  });

  return safeJsonParse(responseText, fallback);
}

export async function createNoActionResult({ email }) {
  return fallbackNoActionSimulation(email);
}
