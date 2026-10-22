import { appendFile } from 'node:fs/promises';

let [mode, argument] = process.argv.slice(2);
let source = argument;
if (mode !== 'argument') {
  source = '';
  for await (let chunk of process.stdin) { source += chunk; }
}
let envelope = JSON.parse(source || '{}');
if (mode === 'hold') {
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1_000);
} else if (mode === 'overflow') {
  process.stdout.write('private-output'.repeat(2_000));
} else if (mode === 'malformed') {
  process.stdout.write('private-output-secret');
} else if (mode === 'fail') {
  process.stderr.write('private-error-secret');
  process.exitCode = 1;
} else if (mode === 'unavailable') {
  process.stdout.write(JSON.stringify({ state: 'unavailable' }));
} else {
  if (mode === 'record' || mode === 'delayed-record') { await appendFile(argument, `${JSON.stringify(envelope)}\n`); }
  if (mode === 'delayed-record') { await new Promise((resolve) => setTimeout(resolve, 1_000)); }
  process.stdout.write(JSON.stringify({ state: 'accepted', receiptId: envelope.submissionId }));
}
