import { generateText } from 'ai';
import { getModel } from '../ai/model.js';

const ALLOWED_CATEGORIES = new Set(['task', 'event', 'no_action']);

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'no_action';
  const value = raw.toLowerCase().trim();
  return ALLOWED_CATEGORIES.has(value) ? value : 'no_action';
}

export async function categorizeEmail(email) {
  const prompt = [
    'CATEGORIZE_EMAIL',
    'Return JSON: {"category":"task|event|no_action","confidence":0-1,"reason":"..."}',
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Body: ${email.body}`
  ].join('\n');

  const { text } = await generateText({
    model: getModel(),
    system: 'You are a strict classifier. Only return JSON.',
    prompt
  });

  const parsed = safeJsonParse(text, {
    category: 'no_action',
    confidence: 0,
    reason: 'Fallback classification'
  });

  return {
    category: normalizeCategory(parsed.category),
    confidence: Number(parsed.confidence || 0),
    reason: String(parsed.reason || 'n/a')
  };
}

export async function taskAgent(email) {
  const prompt = [
    'TASK_AGENT',
    'Return JSON: {"type":"task","title":"...","next_steps":["..."],"owner":"...","due":"..."}',
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Body: ${email.body}`
  ].join('\n');

  const { text } = await generateText({
    model: getModel(),
    system: 'You turn emails into concrete tasks.',
    prompt
  });

  return safeJsonParse(text, {
    type: 'task',
    title: 'Manual review required',
    next_steps: ['Review email manually'],
    owner: 'you',
    due: 'unknown'
  });
}

export async function eventAgent(email) {
  const prompt = [
    'EVENT_AGENT',
    'Return JSON: {"type":"event","title":"...","time":"...","attendees":["..."],"location":"..."}',
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Body: ${email.body}`
  ].join('\n');

  const { text } = await generateText({
    model: getModel(),
    system: 'You turn emails into calendar events.',
    prompt
  });

  return safeJsonParse(text, {
    type: 'event',
    title: 'Manual review required',
    time: 'unknown',
    attendees: ['you'],
    location: 'unknown'
  });
}

export async function noActionAgent(email) {
  const prompt = [
    'NO_ACTION_AGENT',
    'Return JSON: {"type":"no_action","summary":"..."}',
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Body: ${email.body}`
  ].join('\n');

  const { text } = await generateText({
    model: getModel(),
    system: 'Summarize informational emails.',
    prompt
  });

  return safeJsonParse(text, {
    type: 'no_action',
    summary: 'Manual review required'
  });
}

export async function routeEmail(email) {
  const classification = await categorizeEmail(email);
  let result;

  switch (classification.category) {
    case 'task':
      result = await taskAgent(email);
      break;
    case 'event':
      result = await eventAgent(email);
      break;
    default:
      result = await noActionAgent(email);
      break;
  }

  return { classification, result };
}
