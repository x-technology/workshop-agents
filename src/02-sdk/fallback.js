export function fallbackRoute(email) {
  const lower = `${email.subject} ${email.body}`.toLowerCase();
  if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('invite')) {
    return {
      classification: {
        category: 'event',
        confidence: 0.72,
        reason: 'Mentions scheduling or calendar items.'
      },
      result: {
        type: 'event',
        title: 'Follow-up meeting',
        time: 'tomorrow 10:00',
        attendees: ['you', 'sender'],
        location: 'video call'
      }
    };
  }
  if (lower.includes('please') || lower.includes('action') || lower.includes('schedule') || lower.includes('follow up')) {
    return {
      classification: {
        category: 'task',
        confidence: 0.7,
        reason: 'Requests an action or follow-up.'
      },
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
    classification: {
      category: 'no_action',
      confidence: 0.6,
      reason: 'Informational email.'
    },
    result: {
      type: 'no_action',
      summary: 'Informational update, no action required.'
    }
  };
}
