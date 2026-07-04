// Adds new translation keys to every locale file.
// Usage: node scripts/i18n-apply.mjs <translations.json>
// translations.json format: { "key_name": { "en": "...", "tr": "...", "es": "...", ... }, ... }
// - Inserts each key into every locale file that is missing it, before the closing `};`.
// - Idempotent: keys already present in a locale are skipped (never overwritten).
// - Values are JSON-escaped, so quotes/apostrophes/emoji are safe.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const localesDir = path.resolve('src/utils/locales');
const langs = ['en','tr','es','fr','de','it','pt','ru','ar','ja','hi'];

const jsonPath = process.argv[2];
if (!jsonPath) { console.error('Usage: node scripts/i18n-apply.mjs <translations.json>'); process.exit(1); }
const translations = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let totalAdded = 0;
for (const lang of langs) {
  const file = path.join(localesDir, `${lang}.js`);
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const existing = new Set(Object.keys(mod.default));

  const linesToAdd = [];
  for (const [key, byLang] of Object.entries(translations)) {
    if (existing.has(key)) continue;
    // Prefer the language's own translation; fall back to en, then tr, then key.
    const val = byLang[lang] ?? byLang.en ?? byLang.tr ?? key;
    linesToAdd.push(`  ${JSON.stringify(key)}: ${JSON.stringify(val)},`);
  }
  if (!linesToAdd.length) { console.log(`${lang}: 0 added`); continue; }

  let src = fs.readFileSync(file, 'utf8');
  const closeIdx = src.lastIndexOf('};');
  if (closeIdx === -1) { console.error(`${lang}: no closing }; found — skipped`); continue; }
  src = src.slice(0, closeIdx) + linesToAdd.join('\n') + '\n' + src.slice(closeIdx);
  fs.writeFileSync(file, src, 'utf8');
  totalAdded += linesToAdd.length;
  console.log(`${lang}: +${linesToAdd.length}`);
}
console.log(`\nDone. Total entries added: ${totalAdded}`);
