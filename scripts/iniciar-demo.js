import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const datos = 'datos-emulador';
const args = [
  'node_modules/firebase-tools/lib/bin/firebase.js',
  'emulators:exec', '--only', 'firestore',
  '--project', 'demo-reportes-municipales',
  '--export-on-exit=' + datos
];
if (existsSync(datos + '/firebase-export-metadata.json')) args.push('--import=' + datos);
args.push('node scripts/demo.js');

const firebase = spawn(process.execPath, args, { stdio: 'inherit' });
firebase.on('exit', (code) => { process.exitCode = code ?? 0; });
firebase.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
process.on('SIGINT', () => {});
process.on('SIGTERM', () => firebase.kill());
