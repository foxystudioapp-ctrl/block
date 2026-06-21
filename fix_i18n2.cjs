const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

// First, fix the broken syntax:
content = content.replace(/\{cost\n\s*"extra_moves":\s*"[^"]+",\}\s*elmasa/g, '{cost} elmasa');

// Then, manually inject extra_moves before 'save' in each lang
const map = {
  "tr": '+2 Hamle',
  "en": '+2 Moves',
  "ru": '+2 Хода',
  "es": '+2 Movs',
  "fr": '+2 Coups',
  "de": '+2 Züge',
  "pt": '+2 Movimentos',
  "ar": '+2 حركات',
  "zh": '+2 步',
  "hi": '+2 चालें',
  "ur": '+2 چالیں'
};

const saveMap = {
  "tr": '"save": "Kaydet"',
  "en": '"save": "Save"',
  "ru": '"save": "Сохранить"',
  "es": '"save": "Guardar"',
  "fr": '"save": "Enregistrer"',
  "de": '"save": "Speichern"',
  "pt": '"save": "Salvar"',
  "ar": '"save": "حفظ"',
  "zh": '"save": "保存"',
  "hi": '"save": "सहेजें"',
  "ur": '"save": "محفوظ کریں"'
};

for (const lang in map) {
  const saveKey = saveMap[lang];
  const replaceWith = `"extra_moves": "${map[lang]}",\n    ${saveKey}`;
  content = content.replace(saveKey, replaceWith);
}

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Syntax fixed and extra_moves injected successfully.");
