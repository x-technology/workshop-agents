const emails = [
  {
    id: 'email-1',
    from: 'ceo@company.com',
    subject: 'Please review the Q1 roadmap',
    body: 'Can you review the Q1 roadmap and send feedback by Friday?'
  },
  {
    id: 'email-2',
    from: 'hr@company.com',
    subject: 'Team sync tomorrow',
    body: 'Inviting you to a team sync meeting tomorrow at 10:00 via Zoom.'
  },
  {
    id: 'email-3',
    from: 'newsletter@product.com',
    subject: 'Weekly digest',
    body: 'Here are the latest updates from the product team.'
  }
];

function naiveCategorize(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  if (text.includes('meeting') || text.includes('invite') || text.includes('calendar')) return 'event';
  if (text.includes('please') || text.includes('review') || text.includes('action')) return 'task';
  return 'no_action';
}

function route(email) {
  const category = naiveCategorize(email);
  return { id: email.id, category };
}

for (const email of emails) {
  const routed = route(email);
  console.log(`[${email.id}] -> ${routed.category}`);
}
