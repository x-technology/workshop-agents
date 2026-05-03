import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stepDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(stepDir, '../..');
const defaultTracePath = path.join(stepDir, 'trace.jsonl');

export class PromptInjectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PromptInjectionError';
  }
}

function appendTrace(tracePath, event, data) {
  const entry = { time: new Date().toISOString(), event, data };
  fs.appendFileSync(tracePath, `${JSON.stringify(entry)}\n`);
}

function resolveTracePath(tracePath = '') {
  if (!tracePath) return defaultTracePath;
  return path.isAbsolute(tracePath) ? tracePath : path.resolve(repoRoot, tracePath);
}

function extractEmailFromInput(input) {
  if (input?.email && typeof input.email === 'object') {
    return input.email;
  }
  if (input && typeof input === 'object' && ('subject' in input || 'body' in input || 'from' in input)) {
    return input;
  }
  return null;
}

function sanitizeEmail(email) {
  const text = `${email.subject ?? ''} ${email.body ?? ''}`.toLowerCase();
  if (text.includes('ignore previous instructions') || text.includes('system prompt')) {
    throw new PromptInjectionError('Blocked prompt injection attempt');
  }
}

export function getDefaultTracePath() {
  return defaultTracePath;
}

export function clearTrace(tracePath = '') {
  const resolvedTracePath = resolveTracePath(tracePath);
  if (fs.existsSync(resolvedTracePath)) {
    fs.unlinkSync(resolvedTracePath);
  }
}

export function withPromptInjectionGuard(agentFn) {
  return async input => {
    const email = extractEmailFromInput(input);
    if (email) {
      sanitizeEmail(email);
    }
    return agentFn(input);
  };
}

export function withSuccessErrorMonitoring(agentName, agentFn, options = {}) {
  const {
    writeTrace = true,
    tracePath: configuredTracePath = ''
  } = options;

  const tracePath = resolveTracePath(configuredTracePath);

  return async input => {
    const startedAt = Date.now();

    try {
      const result = await agentFn(input);
      if (writeTrace) {
        appendTrace(tracePath, 'agent.completed', {
          agent: agentName,
          status: 'success',
          durationMs: Date.now() - startedAt
        });
      }
      return result;
    } catch (error) {
      if (writeTrace) {
        appendTrace(tracePath, 'agent.failed', {
          agent: agentName,
          status: 'failure',
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
  };
}

export function readTraceEntries(tracePath = '') {
  const resolvedTracePath = resolveTracePath(tracePath);
  if (!fs.existsSync(resolvedTracePath)) return [];

  return fs
    .readFileSync(resolvedTracePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

export function summarizeReliability(tracePath = '') {
  const resolvedTracePath = resolveTracePath(tracePath);
  const entries = readTraceEntries(resolvedTracePath);
  const agents = new Map();

  for (const entry of entries) {
    if (entry.event !== 'agent.completed' && entry.event !== 'agent.failed') {
      continue;
    }

    const name = entry.data?.agent ?? 'unknown';
    const current = agents.get(name) ?? {
      agent: name,
      successCount: 0,
      failureCount: 0,
      totalRuns: 0,
      lastEventTime: null
    };

    current.totalRuns += 1;
    current.lastEventTime = entry.time;

    if (entry.event === 'agent.completed') {
      current.successCount += 1;
    } else {
      current.failureCount += 1;
    }

    agents.set(name, current);
  }

  const items = Array.from(agents.values())
    .map(agent => ({
      ...agent,
      reliability: agent.totalRuns > 0
        ? Number((agent.successCount / agent.totalRuns).toFixed(3))
        : 0
    }))
    .sort((a, b) => a.agent.localeCompare(b.agent));

  return {
    tracePath: resolvedTracePath,
    generatedAt: new Date().toISOString(),
    totalEvents: entries.length,
    totalEmails: 0,
    agents: items
  };
}
