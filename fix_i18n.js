import fs from 'fs';

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": "+2 Hamle",
  "en": "+2 Moves",
  "ru": "+2 Хода",
  "es": "+2 Movs",
  "fr": "+2 Coups",
  "de": "+2 Züge",
  "pt": "+2 Movimentos",
  "ar": "+2 حركات",
  "zh": "+2 步",
  "hi": "+2 चालें",
  "ur": "+2 چالیں"
};

for (const lang in map) {
  const regex = new RegExp(`("${lang}":\\s*{[^}]*)`);
  content = content.replace(regex, `$1\n    "extra_moves": "${map[lang]}",`);
}

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Fixed translations");
