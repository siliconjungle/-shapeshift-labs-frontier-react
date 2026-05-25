import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
fs.rmSync(path.join(packageDir, 'dist'), { recursive: true, force: true });
execFileSync(resolveTsc(), ['-p', path.join(packageDir, 'tsconfig.json')], { stdio: 'inherit' });

function resolveTsc() {
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const candidate = path.join(packageDir, 'node_modules', '.bin', command);
  return fs.existsSync(candidate) ? candidate : command;
}
