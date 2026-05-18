import {
  fallbackAgendaItemSimulation,
  fallbackNoActionSimulation,
  fallbackTaskSimulation,
  normalizeClassification,
} from '../02-sdk/fallback.js';
import { safeJsonParse } from '../02-sdk/json.js';
import { resolveModel } from '../02-sdk/model-resolver.js';
import { formatEmailForAgent, runEmailAgent } from '../02-sdk/adk-runner.js';

function getResolvedModel() {
  const { model } = resolveModel();
  return model;
}

export async function runTaskCreationSimulationAgent({ email, classification, model }) {
  return runEmailAgent({
    model,
    agentName: 'task_creation_simulation_agent',
    instruction: [
      'You simulate creating a task from an actionable email.',
      'Return JSON only. No markdown, no extra text.',
      'Output schema:',
      '{',
      '  "type": "task",',
      '  "status": "simulated",',
      '  "sourceCategory": "task|event",',
      '  "task": {',
      '    "title": "...",',
      '    "next_steps": ["..."],',
      '    "owner": "...",',
      '    "due": "..."',
      '  }',
      '}',
    ].join('\n'),
    promptLines: [
      'TASK_CREATION_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email),
    ],
  });
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
    model,
  });

  return safeJsonParse(responseText, fallback);
}

export async function runAgendaItemSimulationAgent({ email, classification, model }) {
  return runEmailAgent({
    model,
    agentName: 'agenda_item_simulation_agent',
    instruction: [
      'You simulate creating an agenda item from an event email.',
      'Return JSON only. No markdown, no extra text.',
      'Output schema:',
      '{',
      '  "type": "agenda_item",',
      '  "status": "simulated",',
      '  "sourceCategory": "event",',
      '  "agenda_item": {',
      '    "title": "...",',
      '    "time": "...",',
      '    "attendees": ["..."],',
      '    "location": "..."',
      '  }',
      '}',
    ].join('\n'),
    promptLines: [
      'AGENDA_ITEM_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email),
    ],
  });
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
    model,
  });

  return safeJsonParse(responseText, fallback);
}

export async function createNoActionResult({ email }) {
  return fallbackNoActionSimulation(email);
}
