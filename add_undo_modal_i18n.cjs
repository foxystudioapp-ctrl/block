const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": { not_enough_diamonds: "Yetersiz Elmas", watch_ad_use_undo: "Reklam İzle & Geri Al" },
  "en": { not_enough_diamonds: "Not Enough Diamonds", watch_ad_use_undo: "Watch Ad & Undo" },
  "ru": { not_enough_diamonds: "Недостаточно алмазов", watch_ad_use_undo: "Смотреть и Отменить" },
  "es": { not_enough_diamonds: "Sin Diamantes Suficientes", watch_ad_use_undo: "Ver Anuncio y Deshacer" },
  "fr": { not_enough_diamonds: "Pas Assez de Diamants", watch_ad_use_undo: "Voir Pub & Annuler" },
  "de": { not_enough_diamonds: "Nicht genug Diamanten", watch_ad_use_undo: "Video & Rückgängig" },
  "pt": { not_enough_diamonds: "Diamantes Insuficientes", watch_ad_use_undo: "Assistir e Desfazer" },
  "ar": { not_enough_diamonds: "لا يوجد ماس كافي", watch_ad_use_undo: "شاهد إعلان وتراجع" },
  "zh": { not_enough_diamonds: "钻石不足", watch_ad_use_undo: "看广告撤销" },
  "hi": { not_enough_diamonds: "पर्याप्त हीरे नहीं", watch_ad_use_undo: "विज्ञापन देखें और पूर्ववत करें" },
  "ur": { not_enough_diamonds: "کافی ہیرے نہیں", watch_ad_use_undo: "اشتہار دیکھیں اور واپس کریں" }
};

let lines = content.split('\n');

for (const lang in map) {
  const tr = map[lang];
  let inLang = false;
  let insertIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${lang}": {`)) {
      inLang = true;
      insertIdx = i;
    } else if (inLang && lines[i].match(/^\s*\}/)) {
      inLang = false;
    }
  }

  if (insertIdx !== -1) {
    let added = false;
    for (let i = insertIdx + 1; i < lines.length; i++) {
       lines.splice(i, 0, 
         `    "not_enough_diamonds": "${tr.not_enough_diamonds}",`,
         `    "watch_ad_use_undo": "${tr.watch_ad_use_undo}",`
       );
       added = true;
       break;
    }
  }
}

content = lines.join('\n');
fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Updated undo modal strings in all languages.");
