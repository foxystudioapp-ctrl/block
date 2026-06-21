const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": {
    "watch_ad_use_hammer": "Reklam İzle & Çekiç Kullan",
    "watch_ad_use_swap": "Reklam İzle & Takas Yap",
    "watch_ad_use_change": "Reklam İzle & Değiştir",
    "need_diamonds_hammer": "Çekiç için {cost} elmas gerekli!",
    "need_diamonds_swap": "Takas için {cost} elmas gerekli!",
    "need_diamonds_change": "Değiştirmek için {cost} elmas gerekli!"
  },
  "en": {
    "watch_ad_use_hammer": "Watch Ad & Use Hammer",
    "watch_ad_use_swap": "Watch Ad & Swap",
    "watch_ad_use_change": "Watch Ad & Change Next",
    "need_diamonds_hammer": "You need {cost} diamonds for the Hammer!",
    "need_diamonds_swap": "You need {cost} diamonds to Swap!",
    "need_diamonds_change": "You need {cost} diamonds to Change Next!"
  },
  "ru": {
    "watch_ad_use_hammer": "Реклама и Молоток",
    "watch_ad_use_swap": "Реклама и Поменять",
    "watch_ad_use_change": "Реклама и Заменить",
    "need_diamonds_hammer": "Нужно {cost} алмазов для Молотка!",
    "need_diamonds_swap": "Нужно {cost} алмазов для Замены!",
    "need_diamonds_change": "Нужно {cost} алмазов, чтобы обновить!"
  },
  "es": {
    "watch_ad_use_hammer": "Ver Anuncio y Martillo",
    "watch_ad_use_swap": "Ver Anuncio e Intercambiar",
    "watch_ad_use_change": "Ver Anuncio y Cambiar",
    "need_diamonds_hammer": "¡Necesitas {cost} diamantes para el Martillo!",
    "need_diamonds_swap": "¡Necesitas {cost} diamantes para Intercambiar!",
    "need_diamonds_change": "¡Necesitas {cost} diamantes para Cambiar!"
  },
  "fr": {
    "watch_ad_use_hammer": "Pub & Marteau",
    "watch_ad_use_swap": "Pub & Échanger",
    "watch_ad_use_change": "Pub & Changer",
    "need_diamonds_hammer": "Il faut {cost} diamants pour le Marteau!",
    "need_diamonds_swap": "Il faut {cost} diamants pour Échanger!",
    "need_diamonds_change": "Il faut {cost} diamants pour Changer!"
  },
  "de": {
    "watch_ad_use_hammer": "Werbung & Hammer",
    "watch_ad_use_swap": "Werbung & Tauschen",
    "watch_ad_use_change": "Werbung & Ändern",
    "need_diamonds_hammer": "Du brauchst {cost} Diamanten für den Hammer!",
    "need_diamonds_swap": "Du brauchst {cost} Diamanten zum Tauschen!",
    "need_diamonds_change": "Du brauchst {cost} Diamanten zum Ändern!"
  },
  "pt": {
    "watch_ad_use_hammer": "Anúncio & Martelo",
    "watch_ad_use_swap": "Anúncio & Trocar",
    "watch_ad_use_change": "Anúncio & Mudar",
    "need_diamonds_hammer": "Você precisa de {cost} diamantes para o Martelo!",
    "need_diamonds_swap": "Você precisa de {cost} diamantes para Trocar!",
    "need_diamonds_change": "Você precisa de {cost} diamantes para Mudar!"
  },
  "ar": {
    "watch_ad_use_hammer": "إعلان ومطرقة",
    "watch_ad_use_swap": "إعلان وتبديل",
    "watch_ad_use_change": "إعلان وتغيير",
    "need_diamonds_hammer": "تحتاج {cost} ماسة للمطرقة!",
    "need_diamonds_swap": "تحتاج {cost} ماسة للتبديل!",
    "need_diamonds_change": "تحتاج {cost} ماسة للتغيير!"
  },
  "zh": {
    "watch_ad_use_hammer": "看广告 & 锤子",
    "watch_ad_use_swap": "看广告 & 交换",
    "watch_ad_use_change": "看广告 & 换牌",
    "need_diamonds_hammer": "你需要 {cost} 钻石来使用锤子！",
    "need_diamonds_swap": "你需要 {cost} 钻石来交换！",
    "need_diamonds_change": "你需要 {cost} 钻石来换牌！"
  },
  "hi": {
    "watch_ad_use_hammer": "विज्ञापन देखें और हथौड़ा",
    "watch_ad_use_swap": "विज्ञापन देखें और स्वैप",
    "watch_ad_use_change": "विज्ञापन देखें और बदलें",
    "need_diamonds_hammer": "हथौड़े के लिए {cost} हीरे चाहिए!",
    "need_diamonds_swap": "स्वैप के लिए {cost} हीरे चाहिए!",
    "need_diamonds_change": "बदलने के लिए {cost} हीरे चाहिए!"
  },
  "ur": {
    "watch_ad_use_hammer": "اشتہار اور ہتھوڑا",
    "watch_ad_use_swap": "اشتہار اور تبدیل",
    "watch_ad_use_change": "اشتہار اور بدلیں",
    "need_diamonds_hammer": "ہتھوڑے کے لیے {cost} ہیرے درکار ہیں!",
    "need_diamonds_swap": "تبدیل کرنے کے لیے {cost} ہیرے درکار ہیں!",
    "need_diamonds_change": "بدلنے کے لیے {cost} ہیرے درکار ہیں!"
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
  
  let newLines = '';
  for (const k in trs) {
    newLines += `"\\"${k}\\\": \\"${trs[k]}\\\",\\n    " + `;
  }
  // Instead of building a string expression, we can just replace directly.
  
  const inject = Object.keys(trs).map(k => `"${k}": "${trs[k]}",`).join('\\n    ');
  // Safe replace
  content = content.replace(saveKey, inject + '\\n    ' + saveKey);
}

// Ensure the newlines are actual newlines in code
content = content.replace(/\\n/g, '\n');

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Translations injected.");
