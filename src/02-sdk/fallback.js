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
      result: {
        type: 'event',
        title: 'Follow-up meeting',
        time: 'tomorrow 10:00',
        attendees: ['you', 'sender'],
        location: 'video call'
      }
    };
  }

  if (classification.category === 'task') {
    return {
      classification,
      result: {
        type: 'task',
        title: 'Follow up on the client request',
        next_steps: ['Reply with confirmation', 'Schedule the call'],
        owner: 'you',
        due: 'next week'
      }
    };
  }

  return {
    classification,
    result: {
      type: 'no_action',
      summary: 'Informational update, no action required.'
    }
  };
}
