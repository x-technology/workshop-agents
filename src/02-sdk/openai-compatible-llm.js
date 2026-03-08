import { BaseLlm } from '@google/adk';

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

function toOpenAIRole(role) {
  if (role === 'model') return 'assistant';
  if (role === 'system') return 'system';
  return 'user';
}

function buildOpenAIMessages(llmRequest) {
  const messages = [];
  const systemInstruction = llmRequest?.config?.systemInstruction;
  const systemText = normalizeContentText(systemInstruction);
  if (systemText) {
    messages.push({ role: 'system', content: systemText });
  }

  for (const content of llmRequest?.contents ?? []) {
    const text = normalizeContentText(content);
    if (!text) continue;
    messages.push({ role: toOpenAIRole(content.role), content: text });
  }

  return messages;
}

export class OpenAICompatibleLlm extends BaseLlm {
  constructor({ model, apiKey, baseUrl }) {
    super({ model });
    this.apiKey = apiKey || '';
    this.baseUrl = baseUrl.replace(/\/$/, '');
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
        throw new Error('Realtime streaming is not supported for this model.');
      },
      async *receive() {
        yield* llm.generateContentAsync({ ...baseRequest, contents: history }, false);
      }
    };
  }

  async *generateContentAsync(llmRequest) {
    const messages = buildOpenAIMessages(llmRequest);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: llmRequest?.config?.temperature
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      yield {
        errorCode: String(res.status),
        errorMessage: errorText
      };
      return;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    yield {
      content: {
        role: 'model',
        parts: [{ text }]
      }
    };
  }
}
