import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const stepDir = path.dirname(currentFile);
const repoRoot = path.resolve(stepDir, '../..');
const customDir = path.join(repoRoot, '.n8n', 'custom');

const shimFiles = [
  {
    fileName: 'EmailRouter.node.js',
    source: "export { EmailRouter } from '../../src/04-n8n/EmailRouter.node.js';\n"
  },
  {
    fileName: 'EmailClassification.node.js',
    source: "export { EmailClassification } from '../../src/04-n8n/EmailClassification.node.js';\n"
  },
  {
    fileName: 'TaskSimulation.node.js',
    source: "export { TaskSimulation } from '../../src/04-n8n/TaskSimulation.node.js';\n"
  },
  {
    fileName: 'AgendaSimulation.node.js',
    source: "export { AgendaSimulation } from '../../src/04-n8n/AgendaSimulation.node.js';\n"
  },
  {
    fileName: 'AgentReliability.node.js',
    source: "export { AgentReliability } from '../../src/04-n8n/AgentReliability.node.js';\n"
  }
];

async function prepareCustomExtension() {
  await mkdir(customDir, { recursive: true });

  for (const shimFile of shimFiles) {
    await writeFile(path.join(customDir, shimFile.fileName), shimFile.source, 'utf8');
  }

  await copyFile(
    path.join(stepDir, 'email-router.svg'),
    path.join(customDir, 'email-router.svg')
  );
}

await prepareCustomExtension();

console.log('Prepared .n8n/custom for the Email Router, Email Classification Agent, Task Simulation Agent, Agenda Simulation Agent, and Agent Reliability Monitor nodes.');
console.log('Start n8n with:');
console.log('npm run start:n8n');
