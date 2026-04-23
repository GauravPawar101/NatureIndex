import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error('Missing SUPABASE_PROJECT_ID env var.');
  console.error('Example (PowerShell): $env:SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"; npm run supabase:types');
  process.exit(1);
}

const outFile = path.join(process.cwd(), 'src', 'app', 'lib', 'database.types.ts');
await mkdir(path.dirname(outFile), { recursive: true });

const args = ['gen', 'types', 'typescript', '--project-id', projectId, '--schema', 'public'];
const child = spawn('supabase', args, { shell: true });

let stdout = '';
let stderr = '';

child.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

const exitCode = await new Promise((resolve) => {
  child.on('close', resolve);
});

if (exitCode !== 0) {
  console.error(stderr || `supabase exited with code ${exitCode}`);
  process.exit(exitCode || 1);
}

if (!stdout.trim()) {
  console.error('Supabase types generation returned empty output.');
  process.exit(1);
}

await writeFile(outFile, stdout, 'utf8');
console.log(`Wrote Supabase Database types to ${outFile}`);
