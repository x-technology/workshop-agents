import { routeEmail } from '../agents/email-router.js';

const input = {
  from: 'boss@company.com',
  subject: 'Please follow up with the client',
  body: 'Can you schedule a call and send me a summary?'
};

routeEmail(input)
  .then(out => {
    console.log('Classification:', out.classification);
    console.log('Result:', out.result);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
