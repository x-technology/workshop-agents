import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeEmail } from '../agents/email-router.js';

const emailsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../examples/emails.json'
);

const emails = JSON.parse(fs.readFileSync(emailsPath, 'utf8'));

async function orchestrate(allEmails) {
  const results = [];
  const stats = { task: 0, event: 0, no_action: 0 };

  for (const email of allEmails) {
    const routed = await routeEmail(email);
    results.push({ id: email.id, ...routed });
    stats[routed.classification.category] += 1;
  }

  return { results, stats };
}

orchestrate(emails)
  .then(out => {
    console.log('Stats:', out.stats);
    for (const item of out.results) {
      console.log(`${item.id}: ${item.classification.category}`);
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
