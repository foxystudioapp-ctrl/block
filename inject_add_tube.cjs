const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": {
    "watch_ad_use_add_tube": "Reklam İzle & Tüp Ekle",
    "need_diamonds_add_tube": "Ekstra tüp için {cost} elmas gerekli!"
  },
  "en": {
    "watch_ad_use_add_tube": "Watch Ad & Add Tube",
    "need_diamonds_add_tube": "You need {cost} diamonds for an extra tube!"
  },
  "ru": {
    "watch_ad_use_add_tube": "Реклама и Труба",
    "need_diamonds_add_tube": "Нужно {cost} алмазов для трубы!"
  },
  "es": {
    "watch_ad_use_add_tube": "Ver Anuncio y Añadir Tubo",
    "need_diamonds_add_tube": "¡Necesitas {cost} diamantes para el tubo!"
  },
  "fr": {
    "watch_ad_use_add_tube": "Pub & Ajouter Tube",
    "need_diamonds_add_tube": "Il faut {cost} diamants pour le tube!"
  },
  "de": {
    "watch_ad_use_add_tube": "Werbung & Röhre",
    "need_diamonds_add_tube": "Du brauchst {cost} Diamanten für die Röhre!"
  },
  "pt": {
    "watch_ad_use_add_tube": "Anúncio & Tubo",
    "need_diamonds_add_tube": "Você precisa de {cost} diamantes para o tubo!"
  },
  "ar": {
    "watch_ad_use_add_tube": "إعلان وأنبوب",
    "need_diamonds_add_tube": "تحتاج {cost} ماسة للأنبوب!"
  },
  "zh": {
    "watch_ad_use_add_tube": "看广告 & 加管子",
    "need_diamonds_add_tube": "你需要 {cost} 钻石来加管子！"
  },
  "hi": {
    "watch_ad_use_add_tube": "विज्ञापन देखें और ट्यूब जोड़ें",
    "need_diamonds_add_tube": "ट्यूब के लिए {cost} हीरे चाहिए!"
  },
  "ur": {
    "watch_ad_use_add_tube": "اشتہار دیکھیں اور ٹیوب شامل کریں",
    "need_diamonds_add_tube": "ٹیوب کے لیے {cost} ہیرے درکار ہیں!"
  }
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
console.log("Translations injected.");
