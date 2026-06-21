const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": { "task_match_level": "Blok Patlatmaca: 3 seviye tamamla" },
  "en": { "task_match_level": "Match Blocks: Complete 3 levels" },
  "ru": { "task_match_level": "Соедини Блоки: Пройти 3 уровня" },
  "es": { "task_match_level": "Conectar Bloques: Completa 3 niveles" },
  "fr": { "task_match_level": "Associer Blocs: Terminer 3 niveaux" },
  "de": { "task_match_level": "Blöcke Verbinden: 3 Level abschließen" },
  "pt": { "task_match_level": "Combinar Blocos: Completar 3 níveis" },
  "ar": { "task_match_level": "مطابقة الكتل: أكمل 3 مستويات" },
  "zh": { "task_match_level": "连线方块：完成3个关卡" },
  "hi": { "task_match_level": "ब्लॉक मैच: 3 स्तर पूरे करें" },
  "ur": { "task_match_level": "بلاک میچ: 3 لیولز مکمل کریں" }
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
  const trs = map[lang];
  
  const inject = Object.keys(trs).map(k => `"${k}": "${trs[k]}",`).join('\\n    ');
  content = content.replace(saveKey, inject + '\\n    ' + saveKey);
}

content = content.replace(/\\n/g, '\n');
fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Match task translations injected.");
