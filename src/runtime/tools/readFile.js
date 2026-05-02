import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../examples'
);

export async function readFile({ path: targetPath, root = defaultRoot }) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Access denied: ${resolvedTarget} is outside ${resolvedRoot}`);
  }

  return fs.readFileSync(resolvedTarget, 'utf8');
}
