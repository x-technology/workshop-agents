import { InMemoryRunner, LlmAgent, isFinalResponse } from '@google/adk';
import { createUserContent } from '@google/genai';
import { APP_NAME, USER_ID } from './config.js';
import { fallbackClassification, fallbackRoute, normalizeClassification } from './fallback.js';
import { safeJsonParse } from './json.js';

export function formatEmailForAgent(email) {
  return [
    `From: ${email.from ?? 'unknown'}`,
    `Subject: ${email.subject ?? ''}`,
    `Body: ${email.body ?? ''}`
  ].join('\n');
}

export async function runEmailAgent({ model, agentName, instruction, promptLines }) {
  const agent = new LlmAgent({
    name: agentName,
    model,
    instruction
  });

  const runner = new InMemoryRunner({ appName: APP_NAME, agent });
  const prompt = promptLines.join('\n');

  const message = createUserContent(prompt);
  let finalResponse = '';

  // `runEphemeral(...)` fits this step because each email is handled as a one-shot run.
  // Use explicit `createSession(...)` + `runAsync(...)` instead when you need a stable session
  // ID or want to preserve state across multiple user messages.
  for await (const event of runner.runEphemeral({ userId: USER_ID, newMessage: message })) {
    if (isFinalResponse(event) && event.content?.parts?.length) {
      finalResponse = event.content.parts.map(part => part.text ?? '').join('');
    }
  }

  return finalResponse;
}

export async function runClassificationAgent({ email, model }) {
  return runEmailAgent({
    model,
    agentName: 'email_classification_agent',
    instruction: [
      'You are an email classification agent.',
      'Return JSON only. No markdown, no extra text.',
      'Output schema:',
      '{ "category": "task|event|no_action", "confidence": 0-1, "reason": "..." }'
    ].join('\n'),
    promptLines: [
      'EMAIL_TO_CLASSIFY',
      formatEmailForAgent(email)
    ]
  });
}

export async function runTriageAgent({ email, model }) {
  return runEmailAgent({
    model,
    agentName: 'email_triage_agent',
    instruction: [
      'You are an email triage agent.',
      'Return JSON only. No markdown, no extra text.',
      'Output schema:',
      '{',
      '  "classification": { "category": "task|event|no_action", "confidence": 0-1, "reason": "..." },',
      '  "result": {',
      '    // if category=task:',
      '    // { "type":"task","title":"...","next_steps":["..."],"owner":"...","due":"..." }',
      '    // if category=event:',
      '    // { "type":"event","title":"...","time":"...","attendees":["..."],"location":"..." }',
      '    // if category=no_action:',
      '    // { "type":"no_action","summary":"..." }',
      '  }',
      '}'
    ].join('\n'),
    promptLines: [
      'EMAIL_TO_TRIAGE',
      formatEmailForAgent(email)
    ]
  });
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
      '}'
    ].join('\n'),
    promptLines: [
      'TASK_CREATION_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email)
    ]
  });
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
      '}'
    ].join('\n'),
    promptLines: [
      'AGENDA_ITEM_SIMULATION',
      `Classification: ${classification.category}`,
      `Reason: ${classification.reason}`,
      formatEmailForAgent(email)
    ]
  });
}

export async function categorizeEmailWithAdk({ email, model }) {
  const responseText = await runClassificationAgent({ email, model });
  const parsed = safeJsonParse(responseText, fallbackClassification(email));
  return normalizeClassification(parsed, email);
}

export async function routeEmailWithAdk({ email, model }) {
  const responseText = await runTriageAgent({ email, model });
  return safeJsonParse(responseText, fallbackRoute(email));
}
