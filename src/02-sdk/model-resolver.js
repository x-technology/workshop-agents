import {
  GEMINI_MODEL,
  LOCAL_BASE_URL,
  LOCAL_MODEL,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  PROVIDER
} from './config.js';
import { OpenAICompatibleLlm } from './openai-compatible-llm.js';

function hasGeminiKey() {
  return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function resolveModel() {
  const provider = PROVIDER;

  if (provider === 'gemini') {
    if (!hasGeminiKey()) {
      return { model: null, reason: 'Missing GOOGLE_API_KEY or GEMINI_API_KEY.' };
    }
    return { model: GEMINI_MODEL, reason: null };
  }

  if (provider === 'openai') {
    if (!hasOpenAIKey()) {
      return { model: null, reason: 'Missing OPENAI_API_KEY.' };
    }
    return {
      model: new OpenAICompatibleLlm({
        model: OPENAI_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: OPENAI_BASE_URL
      }),
      reason: null
    };
  }

  if (provider === 'local') {
    return {
      model: new OpenAICompatibleLlm({
        model: LOCAL_MODEL,
        apiKey: process.env.LOCAL_API_KEY,
        baseUrl: LOCAL_BASE_URL
      }),
      reason: null
    };
  }

  if (hasGeminiKey()) {
    return { model: GEMINI_MODEL, reason: null };
  }

  if (hasOpenAIKey()) {
    return {
      model: new OpenAICompatibleLlm({
        model: OPENAI_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: OPENAI_BASE_URL
      }),
      reason: null
    };
  }

  return { model: null, reason: 'No model credentials found.' };
}
