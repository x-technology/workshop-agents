const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';

function trimTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

export function resolveOpenAICompatibleConfig() {
  const baseUrl = trimTrailingSlash(process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);
  const apiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const isDefaultBaseUrl = baseUrl === DEFAULT_BASE_URL;

  return {
    apiKey,
    baseUrl,
    model,
    isConfigured: Boolean(apiKey) || !isDefaultBaseUrl
  };
}

export async function createJsonCompletion({
  system,
  user,
  schema,
  schemaName,
  model,
  apiKey,
  baseUrl
}) {
  const resolved = resolveOpenAICompatibleConfig();
  const targetBaseUrl = trimTrailingSlash(baseUrl || resolved.baseUrl);
  const targetApiKey = apiKey ?? resolved.apiKey;
  const targetModel = model || resolved.model;

  const response = await fetch(`${targetBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(targetApiKey ? { Authorization: `Bearer ${targetApiKey}` } : {})
    },
    body: JSON.stringify({
      model: targetModel,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema
        }
      },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('LLM returned an empty response.');
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `LLM returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
