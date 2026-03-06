import { MockLanguageModelV3 } from 'ai/test';
import { openai } from '@ai-sdk/openai';

function buildMockModel() {
  return new MockLanguageModelV3({
    doGenerate: async options => {
      const raw = JSON.stringify(options);
      const lower = raw.toLowerCase();

      let text = 'no_action';
      if (lower.includes('categorize_email')) {
        if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('invite')) {
          text = JSON.stringify({ category: 'event', confidence: 0.82, reason: 'Looks like a meeting invite.' });
        } else if (lower.includes('please') || lower.includes('action') || lower.includes('review')) {
          text = JSON.stringify({ category: 'task', confidence: 0.78, reason: 'Asks for a follow-up or action.' });
        } else {
          text = JSON.stringify({ category: 'no_action', confidence: 0.7, reason: 'FYI style email.' });
        }
      } else if (lower.includes('task_agent')) {
        text = JSON.stringify({
          type: 'task',
          title: 'Follow up on the email request',
          next_steps: ['Reply with confirmation', 'Schedule time if needed'],
          owner: 'you',
          due: 'next week'
        });
      } else if (lower.includes('event_agent')) {
        text = JSON.stringify({
          type: 'event',
          title: 'Team sync',
          time: 'tomorrow 10:00',
          attendees: ['you', 'sender'],
          location: 'video call'
        });
      } else if (lower.includes('no_action_agent')) {
        text = JSON.stringify({
          type: 'no_action',
          summary: 'Informational email, no action required.'
        });
      }

      return {
        content: [{ type: 'text', text }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 20, text: 20, reasoning: undefined }
        },
        warnings: []
      };
    }
  });
}

export function getModel() {
  if (process.env.USE_MOCK === '1') return buildMockModel();
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o-mini');

  // Fallback to mock when no API key is configured.
  return buildMockModel();
}
