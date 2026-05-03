export const ALLOWED_CATEGORIES = new Set(['task', 'event', 'no_action']);

function emailText(email) {
  return `${email.subject ?? ''} ${email.body ?? ''}`.toLowerCase();
}

export function normalizeCategory(raw) {
  if (typeof raw !== 'string') return 'no_action';
  const normalized = raw.trim().toLowerCase();
  return ALLOWED_CATEGORIES.has(normalized) ? normalized : 'no_action';
}

export function fallbackClassification(email) {
  const lower = emailText(email);

  if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('invite')) {
    return {
      category: 'event',
      confidence: 0.72,
      reason: 'Mentions scheduling or calendar items.'
    };
  }

  if (lower.includes('please') || lower.includes('action') || lower.includes('schedule') || lower.includes('follow up')) {
    return {
      category: 'task',
      confidence: 0.7,
      reason: 'Requests an action or follow-up.'
    };
  }

  return {
    category: 'no_action',
    confidence: 0.6,
    reason: 'Informational email.'
  };
}

export function normalizeClassification(raw, email) {
  const fallback = fallbackClassification(email);
  const source = raw && typeof raw === 'object' ? raw : fallback;

  return {
    category: normalizeCategory(source.category ?? fallback.category),
    confidence: Number(source.confidence ?? fallback.confidence ?? 0),
    reason: String(source.reason ?? fallback.reason ?? 'n/a')
  };
}

export function fallbackRoute(email) {
  const classification = fallbackClassification(email);

  if (classification.category === 'event') {
    return {
      classification,
      result: fallbackAgendaItemSimulation(email, classification)
    };
  }

  if (classification.category === 'task') {
    return {
      classification,
      result: fallbackTaskSimulation(email, classification)
    };
  }

  return {
    classification,
    result: fallbackNoActionSimulation(email)
  };
}

export function fallbackTaskSimulation(email, classification = fallbackClassification(email)) {
  const subject = email.subject ?? 'Untitled email';

  return {
    type: 'task',
    status: 'simulated',
    sourceCategory: classification.category,
    task: {
      title: `Follow up: ${subject}`,
      next_steps: ['Reply to the sender', 'Track the requested follow-up'],
      owner: 'you',
      due: 'next workday'
    }
  };
}

export function fallbackAgendaItemSimulation(email, classification = fallbackClassification(email)) {
  const subject = email.subject ?? 'Untitled event';

  return {
    type: 'agenda_item',
    status: 'simulated',
    sourceCategory: classification.category,
    agenda_item: {
      title: subject,
      time: 'tomorrow 10:00',
      attendees: ['you', 'sender'],
      location: 'video call'
    }
  };
}

export function fallbackNoActionSimulation(email) {
  return {
    type: 'no_action',
    summary: `Informational update, no action required for "${email.subject ?? 'this email'}".`
  };
}
