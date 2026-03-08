export const APP_NAME = 'holyjs_adk_workshop';
export const USER_ID = 'workshop_user';
export const SESSION_ID = 'session_02_sdk';

export const PROVIDER = (process.env.SDK_PROVIDER || 'auto').toLowerCase();

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export const LOCAL_MODEL = process.env.LOCAL_MODEL || 'llama3.2';
export const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1';
