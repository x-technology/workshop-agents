import { InMemoryRunner, LlmAgent, isFinalResponse } from '@google/adk';
import { createUserContent } from '@google/genai';
import { APP_NAME, SESSION_ID, USER_ID } from './config.js';

export async function runTriageAgent({ email, model }) {
  const triageAgent = new LlmAgent({
    name: 'email_triage_agent',
    model,
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
    ].join('\n')
  });

  const runner = new InMemoryRunner({ appName: APP_NAME, agent: triageAgent });
  await runner.sessionService.createSession({ appName: APP_NAME, userId: USER_ID, sessionId: SESSION_ID });

  const prompt = [
    'EMAIL_TO_TRIAGE',
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Body: ${email.body}`
  ].join('\n');

  const message = createUserContent(prompt);
  let finalResponse = '';

  for await (const event of runner.runAsync({ userId: USER_ID, sessionId: SESSION_ID, newMessage: message })) {
    if (isFinalResponse(event) && event.content?.parts?.length) {
      finalResponse = event.content.parts.map(part => part.text ?? '').join('');
    }
  }

  return finalResponse;
}
