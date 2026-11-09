/**
 * Checks the Play Store texts in store/listing.md against Google Play's length limits.
 *   node store/check-listing.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'listing.md'), 'utf8');
const LIMITS = { name: 30, short: 80, full: 4000, notes: 500 };
let bad = 0;
for (const [field, max] of Object.entries(LIMITS))
  for (const lang of ['en', 'ro']) {
    const m = md.match(new RegExp(`<!-- ${field}:${lang} -->\\n([\\s\\S]*?)\\n<!-- /${field}:${lang} -->`));
    if (!m) {
      console.log(`missing ${field}:${lang}`);
      bad++;
      continue;
    }
    const n = [...m[1]].length;
    const ok = n <= max;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'TOO LONG'} ${field}:${lang} ${n}/${max}`);
  }
process.exit(bad ? 1 : 0);
