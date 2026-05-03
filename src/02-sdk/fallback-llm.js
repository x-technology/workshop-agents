import { BaseLlm } from '@google/adk';
import {
  fallbackAgendaItemSimulation,
  fallbackClassification,
  fallbackRoute,
  fallbackTaskSimulation,
  normalizeClassification
} from './fallback.js';

function normalizeParts(parts) {
  if (!Array.isArray(parts)) return '';
  return parts.map(part => (typeof part?.text === 'string' ? part.text : '')).join('');
}

function normalizeContentText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content?.parts)) return normalizeParts(content.parts);
  return '';
}

function parsePromptSections(prompt) {
  const lines = String(prompt).split('\n');
  const marker = lines[0]?.trim();
  const sections = new Map();
  let currentLabel = null;
  let buffer = [];

  for (const line of lines.slice(1)) {
    const labelMatch = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (labelMatch) {
      if (currentLabel) {
        sections.set(currentLabel, buffer.join('\n').trim());
      }
      currentLabel = labelMatch[1];
      buffer = [labelMatch[2]];
      continue;
    }
    buffer.push(line);
  }

  if (currentLabel) {
    sections.set(currentLabel, buffer.join('\n').trim());
  }

  return { marker, sections };
}

function buildEmailFromPrompt(prompt) {
  const { sections } = parsePromptSections(prompt);
  return {
    from: sections.get('From') ?? 'unknown',
    subject: sections.get('Subject') ?? '',
    body: sections.get('Body') ?? ''
  };
}

function buildClassificationFromPrompt(prompt, email) {
  const { sections } = parsePromptSections(prompt);
  return normalizeClassification(
    {
      category: sections.get('Classification'),
      reason: sections.get('Reason')
    },
    email
  );
}

function buildResponseText(prompt) {
  const { marker } = parsePromptSections(prompt);
  const email = buildEmailFromPrompt(prompt);

  if (marker === 'EMAIL_TO_CLASSIFY') {
    return JSON.stringify(fallbackClassification(email));
  }

  if (marker === 'TASK_CREATION_SIMULATION') {
    const classification = buildClassificationFromPrompt(prompt, email);
    return JSON.stringify(fallbackTaskSimulation(email, classification));
  }

  if (marker === 'AGENDA_ITEM_SIMULATION') {
    const classification = buildClassificationFromPrompt(prompt, email);
    return JSON.stringify(fallbackAgendaItemSimulation(email, classification));
  }

  return JSON.stringify(fallbackRoute(email));
}

export class KeywordFallbackLlm extends BaseLlm {
  constructor({ model = 'keyword-fallback' } = {}) {
    super({ model });
  }

  async connect(llmRequest) {
    const llm = this;
    let history = [];
    const baseRequest = { ...llmRequest, contents: [] };

    return {
      async close() {},
      async sendHistory(newHistory) {
        history = Array.isArray(newHistory) ? newHistory : [];
      },
      async sendContent(content) {
        history = [...history, content];
      },
      async sendRealtime() {
        throw new Error('Realtime streaming is not supported for the fallback model.');
      },
      async *receive() {
        yield* llm.generateContentAsync({ ...baseRequest, contents: history }, false);
      }
    };
  }

  async *generateContentAsync(llmRequest) {
    const prompt = (llmRequest?.contents ?? []).map(normalizeContentText).join('\n');
    const text = buildResponseText(prompt);

    yield {
      content: {
        role: 'model',
        parts: [{ text }]
      }
    };
  }
}
