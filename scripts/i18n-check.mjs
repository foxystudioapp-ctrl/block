// i18n guard: verifies every locale file defines the same set of keys.
// Fails (exit 1) if any language is missing keys present in en∪tr (the maintained refs).
// Run before build to prevent English-fallback regressions.
//   node scripts/i18n-check.mjs
import path from 'path';
import { pathToFileURL } from 'url';

const localesDir = path.resolve('src/utils/locales');
const langs = ['en','tr','es','fr','de','it','pt','ru','ar','ja','hi'];

const keysByLang = {};
for (const l of langs) {
  const mod = await import(pathToFileURL(path.join(localesDir, `${l}.js`)).href);
  keysByLang[l] = new Set(Object.keys(mod.default));
}
const ref = new Set([...keysByLang['en'], ...keysByLang['tr']]);

let failed = false;
for (const l of langs) {
  const missing = [...ref].filter(k => !keysByLang[l].has(k));
  if (missing.length) {
    failed = true;
    console.error(`✗ ${l}: missing ${missing.length} keys -> ${missing.join(', ')}`);
  } else {
    console.log(`✓ ${l}: complete (${keysByLang[l].size} keys)`);
  }
}
if (failed) { console.error('\ni18n-check FAILED: some languages are missing keys.'); process.exit(1); }
console.log('\ni18n-check passed: all languages complete.');
