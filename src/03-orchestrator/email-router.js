import {
  categorizeEmailWithAdk,
  formatEmailForAgent,
  runEmailAgent
} from '../02-sdk/adk-runner.js';
import {
  fallbackClassification,
  normalizeClassification
} from '../02-sdk/fallback.js';
import { safeJsonParse } from '../02-sdk/json.js';
import { resolveModel } from '../02-sdk/model-resolver.js';

function getResolvedModel() {
  const { model } = resolveModel();
  return model;
}

function buildTaskSimulationFallback(email, classification) {
  const subject = email.subject ?? 'Untitled email';

  return {
    type: 'task',
    status: 'simulated',
    sourceCategory: classification.category,
    task: {
      title: classification.category === 'event'
        ? `Prepare for event: ${subject}`
        : `Follow up: ${subject}`,
      next_steps: classification.category === 'event'
        ? ['Review the invite details', 'Confirm attendance or propose changes']
        : ['Reply to the sender', 'Track the requested follow-up'],
      owner: 'you',
      due: classification.category === 'event' ? 'before the event starts' : 'next workday'
    }
  };
}

function buildNoActionFallback(email, classification) {
  return {
    type: 'no_action',
    status: 'simulated',
    sourceCategory: classification.category,
    summary: `No follow-up required for "${email.subject ?? 'this email'}".`
  };
}

export async function categorizeEmail(email) {
  const model = getResolvedModel();

  if (!model) {
    return fallbackClassification(email);
  }

  return categorizeEmailWithAdk({ email, model });
}

async function runTaskSimulationAgent(email, classification) {
  const model = getResolvedModel();
  const fallback = buildTaskSimulationFallback(email, classification);

  if (!model) {
    return fallback;
  }

  const text = await runEmailAgent({
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
      '}'
    ].join('\n'),
    promptLines: [
      'TASK_CREATION_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email)
    ]
  });

  return safeJsonParse(text, fallback);
}

async function runNoActionSimulationAgent(email, classification) {
  const model = getResolvedModel();
  const fallback = buildNoActionFallback(email, classification);

  if (!model) {
    return fallback;
  }

  const text = await runEmailAgent({
    model,
    agentName: 'no_action_simulation_agent',
    instruction: [
      'You simulate the decision to take no action on an email.',
      'Return JSON only. No markdown, no extra text.',
      'Output schema:',
      '{',
      '  "type": "no_action",',
      '  "status": "simulated",',
      '  "sourceCategory": "no_action",',
      '  "summary": "..."',
      '}'
    ].join('\n'),
    promptLines: [
      'NO_ACTION_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email)
    ]
  });

  return safeJsonParse(text, fallback);
}

export async function taskAgent(email) {
  const classification = normalizeClassification({ category: 'task' }, email);
  return runTaskSimulationAgent(email, classification);
}

export async function eventAgent(email) {
  const classification = normalizeClassification({ category: 'event' }, email);
  return runTaskSimulationAgent(email, classification);
}

export async function noActionAgent(email) {
  const classification = normalizeClassification({ category: 'no_action' }, email);
  return runNoActionSimulationAgent(email, classification);
}

export async function routeEmail(email) {
  const classification = await categorizeEmail(email);

  if (classification.category === 'no_action') {
    return {
      classification,
      result: await runNoActionSimulationAgent(email, classification)
    };
  }

  return {
    classification,
    result: await runTaskSimulationAgent(email, classification)
  };
}
