import fs from 'node:fs';

const file = new URL('../src/main-prod.jsx', import.meta.url);
let text = fs.readFileSync(file, 'utf8');
const before = text;

// The patient-medication patch intentionally writes template-literal syntax as text.
// Older revisions left a backslash before generated backticks (\`), which is invalid JSX.
// Normalize those generated template literals before Vite/esbuild runs.
text = text.replace(/\\`/g, '`');

if (text !== before) {
  fs.writeFileSync(file, text);
  console.log('Repaired generated medication workflow template literals.');
} else {
  console.log('Medication workflow syntax already clean.');
}
