import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  categorizeEmail,
  eventAgent,
  noActionAgent,
  taskAgent
} from '../03-orchestrator/email-router.js';

const stepDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(stepDir, '../..');
const defaultTracePath = path.join(stepDir, 'trace.jsonl');

const AGENT_BY_CATEGORY = {
  task: { name: 'taskAgent', run: taskAgent },
  event: { name: 'eventAgent', run: eventAgent },
  no_action: { name: 'noActionAgent', run: noActionAgent }
};

export class PromptInjectionError extends Error {
  constructor(message, monitor) {
    super(message);
    this.name = 'PromptInjectionError';
    this.monitor = monitor;
  }
}

function makeEmailId() {
  return `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function appendTrace(tracePath, event, data) {
  const entry = { time: new Date().toISOString(), event, data };
  fs.appendFileSync(tracePath, `${JSON.stringify(entry)}\n`);
}

function markStageStart(monitor, name, emailId) {
  const stage = {
    name,
    status: 'running',
    startedAt: new Date().toISOString()
  };

  monitor.agents.push(stage);

  return {
    complete(extra = {}) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.parse(finishedAt) - Date.parse(stage.startedAt);
      Object.assign(stage, {
        status: 'success',
        finishedAt,
        durationMs,
        ...extra
      });

      return {
        emailId,
        agent: name,
        status: stage.status,
        durationMs,
        ...extra
      };
    },
    fail(error, extra = {}) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.parse(finishedAt) - Date.parse(stage.startedAt);
      Object.assign(stage, {
        status: 'failure',
        finishedAt,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        ...extra
      });

      return {
        emailId,
        agent: name,
        status: stage.status,
        durationMs,
        error: stage.error,
        ...extra
      };
    }
  };
}

function sanitizeEmail(email) {
  const text = `${email.subject ?? ''} ${email.body ?? ''}`.toLowerCase();
  if (text.includes('ignore previous instructions') || text.includes('system prompt')) {
    throw new Error('Blocked prompt injection attempt');
  }
  return email;
}

function finalizeMonitor(monitor) {
  monitor.finishedAt = new Date().toISOString();
  monitor.totalDurationMs = Date.parse(monitor.finishedAt) - Date.parse(monitor.startedAt);

  const successfulAgents = monitor.agents.filter(agent => agent.status === 'success').length;
  const failedAgents = monitor.agents.filter(agent => agent.status === 'failure').length;

  monitor.reliability = {
    successfulAgents,
    failedAgents,
    successRate: successfulAgents + failedAgents > 0
      ? Number((successfulAgents / (successfulAgents + failedAgents)).toFixed(3))
      : 0
  };

  return monitor;
}

function resolveTracePath(tracePath = '') {
  if (!tracePath) return defaultTracePath;
  return path.isAbsolute(tracePath) ? tracePath : path.resolve(repoRoot, tracePath);
}

export function getDefaultTracePath() {
  return defaultTracePath;
}

export function createMonitor(email, tracePath) {
  return {
    emailId: makeEmailId(),
    startedAt: new Date().toISOString(),
    tracePath,
    email: {
      from: email.from ?? 'unknown',
      subject: email.subject ?? ''
    },
    blocked: false,
    agents: []
  };
}

export async function secureRouteWithMonitor(email, options = {}) {
  const {
    blockPromptInjection = true,
    writeTrace = true,
    tracePath: configuredTracePath = ''
  } = options;

  const tracePath = resolveTracePath(configuredTracePath);
  const monitor = createMonitor(email, tracePath);

  if (writeTrace) {
    appendTrace(tracePath, 'email.received', {
      emailId: monitor.emailId,
      from: monitor.email.from,
      subject: monitor.email.subject
    });
  }

  if (blockPromptInjection) {
    const securityStage = markStageStart(monitor, 'securityGuard', monitor.emailId);

    try {
      sanitizeEmail(email);
      const securityData = securityStage.complete({ outcome: 'passed' });
      if (writeTrace) appendTrace(tracePath, 'agent.completed', securityData);
    } catch (error) {
      monitor.blocked = true;
      const securityData = securityStage.complete({ outcome: 'blocked' });
      finalizeMonitor(monitor);

      if (writeTrace) {
        appendTrace(tracePath, 'agent.completed', securityData);
        appendTrace(tracePath, 'email.blocked', {
          emailId: monitor.emailId,
          reason: error instanceof Error ? error.message : String(error)
        });
      }

      throw new PromptInjectionError(
        error instanceof Error ? error.message : String(error),
        monitor
      );
    }
  }

  const routerStage = markStageStart(monitor, 'router', monitor.emailId);
  let classification;

  try {
    classification = await categorizeEmail(email);
    const routerData = routerStage.complete({
      category: classification.category,
      confidence: classification.confidence
    });
    if (writeTrace) appendTrace(tracePath, 'agent.completed', routerData);
  } catch (error) {
    const routerData = routerStage.fail(error);
    finalizeMonitor(monitor);

    if (writeTrace) {
      appendTrace(tracePath, 'agent.failed', routerData);
      appendTrace(tracePath, 'email.failed', {
        emailId: monitor.emailId,
        stage: 'router',
        error: routerData.error
      });
    }

    if (error instanceof Error) error.monitor = monitor;
    throw error;
  }

  const agentConfig = AGENT_BY_CATEGORY[classification.category] ?? AGENT_BY_CATEGORY.no_action;
  const agentStage = markStageStart(monitor, agentConfig.name, monitor.emailId);

  try {
    const result = await agentConfig.run(email);
    const agentData = agentStage.complete({ category: classification.category });
    const finalMonitor = finalizeMonitor(monitor);

    if (writeTrace) {
      appendTrace(tracePath, 'agent.completed', agentData);
      appendTrace(tracePath, 'email.routed', {
        emailId: monitor.emailId,
        category: classification.category,
        totalDurationMs: finalMonitor.totalDurationMs
      });
    }

    return {
      result: { classification, result },
      monitor: finalMonitor
    };
  } catch (error) {
    const agentData = agentStage.fail(error, { category: classification.category });
    finalizeMonitor(monitor);

    if (writeTrace) {
      appendTrace(tracePath, 'agent.failed', agentData);
      appendTrace(tracePath, 'email.failed', {
        emailId: monitor.emailId,
        stage: agentConfig.name,
        category: classification.category,
        error: agentData.error
      });
    }

    if (error instanceof Error) error.monitor = monitor;
    throw error;
  }
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
  const emails = new Set();

  for (const entry of entries) {
    if (entry.data?.emailId) emails.add(entry.data.emailId);

    if (entry.event !== 'agent.completed' && entry.event !== 'agent.failed') continue;

    const name = entry.data?.agent ?? 'unknown';
    const current = agents.get(name) ?? {
      agent: name,
      successCount: 0,
      failureCount: 0,
      blockedCount: 0,
      totalRuns: 0,
      averageDurationMs: 0,
      totalDurationMs: 0,
      lastEventTime: null,
      lastCategory: null
    };

    current.totalRuns += 1;
    current.totalDurationMs += Number(entry.data?.durationMs ?? 0);
    current.lastEventTime = entry.time;
    current.lastCategory = entry.data?.category ?? current.lastCategory;

    if (entry.data?.outcome === 'blocked') {
      current.blockedCount += 1;
      current.successCount += 1;
    } else if (entry.event === 'agent.completed') {
      current.successCount += 1;
    } else {
      current.failureCount += 1;
    }

    agents.set(name, current);
  }

  const items = Array.from(agents.values())
    .map(agent => ({
      ...agent,
      averageDurationMs: agent.totalRuns > 0
        ? Number((agent.totalDurationMs / agent.totalRuns).toFixed(2))
        : 0,
      reliability: agent.totalRuns > 0
        ? Number((agent.successCount / agent.totalRuns).toFixed(3))
        : 0
    }))
    .sort((a, b) => a.agent.localeCompare(b.agent));

  return {
    tracePath: resolvedTracePath,
    generatedAt: new Date().toISOString(),
    totalEvents: entries.length,
    totalEmails: emails.size,
    agents: items
  };
}
