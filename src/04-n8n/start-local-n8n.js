import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const stepDir = path.dirname(currentFile);
const repoRoot = path.resolve(stepDir, '../..');
const n8nBin = path.join(repoRoot, 'node_modules', 'n8n', 'bin', 'n8n');
const { N8N_CUSTOM_EXTENSIONS: _ignoredCustomExtensions, ...inheritedEnv } = process.env;

const child = spawn(process.execPath, [n8nBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...inheritedEnv,
    N8N_USER_FOLDER: repoRoot
  }
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
