const fs = require('fs');

const ranks = {
  "en": {
    "rank_novice": "Novice",
    "rank_apprentice": "Apprentice",
    "rank_adept": "Adept",
    "rank_master": "Master",
    "rank_grandmaster": "Grandmaster",
    "rank_legend": "Legend",
    "rank_supreme": "Supreme"
  },
  "tr": {
    "rank_novice": "Acemi",
    "rank_apprentice": "Çırak",
    "rank_adept": "Usta Adayı",
    "rank_master": "Usta",
    "rank_grandmaster": "Büyük Usta",
    "rank_legend": "Efsane",
    "rank_supreme": "Yüce"
  },
  "es": {
    "rank_novice": "Novato",
    "rank_apprentice": "Aprendiz",
    "rank_adept": "Adepto",
    "rank_master": "Maestro",
    "rank_grandmaster": "Gran Maestro",
    "rank_legend": "Leyenda",
    "rank_supreme": "Supremo"
  },
  "fr": {
    "rank_novice": "Novice",
    "rank_apprentice": "Apprenti",
    "rank_adept": "Adepte",
    "rank_master": "Maître",
    "rank_grandmaster": "Grand Maître",
    "rank_legend": "Légende",
    "rank_supreme": "Suprême"
  },
  "de": {
    "rank_novice": "Anfänger",
    "rank_apprentice": "Lehrling",
    "rank_adept": "Adept",
    "rank_master": "Meister",
    "rank_grandmaster": "Großmeister",
    "rank_legend": "Legende",
    "rank_supreme": "Höchster"
  },
  "it": {
    "rank_novice": "Principiante",
    "rank_apprentice": "Apprendista",
    "rank_adept": "Adepto",
    "rank_master": "Maestro",
    "rank_grandmaster": "Gran Maestro",
    "rank_legend": "Leggenda",
    "rank_supreme": "Supremo"
  },
  "pt": {
    "rank_novice": "Novato",
    "rank_apprentice": "Aprendiz",
    "rank_adept": "Adepto",
    "rank_master": "Mestre",
    "rank_grandmaster": "Grão-Mestre",
    "rank_legend": "Lenda",
    "rank_supreme": "Supremo"
  },
  "ru": {
    "rank_novice": "Новичок",
    "rank_apprentice": "Ученик",
    "rank_adept": "Адепт",
    "rank_master": "Мастер",
    "rank_grandmaster": "Гроссмейстер",
    "rank_legend": "Легенда",
    "rank_supreme": "Высший"
  },
  "ar": {
    "rank_novice": "مبتدئ",
    "rank_apprentice": "متدرب",
    "rank_adept": "خبير",
    "rank_master": "سيد",
    "rank_grandmaster": "أستاذ كبير",
    "rank_legend": "أسطورة",
    "rank_supreme": "أعلى"
  },
  "ja": {
    "rank_novice": "ノービス",
    "rank_apprentice": "見習い",
    "rank_adept": "熟練者",
    "rank_master": "マスター",
    "rank_grandmaster": "グランドマスター",
    "rank_legend": "レジェンド",
    "rank_supreme": "スプリーム"
  },
  "hi": {
    "rank_novice": "नौसिखिया",
    "rank_apprentice": "शिक्षु",
    "rank_adept": "निपुण",
    "rank_master": "मास्टर",
    "rank_grandmaster": "ग्रैंडमास्टर",
    "rank_legend": "किंवदंती",
    "rank_supreme": "सर्वोच्च"
  }
};

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

if (content.includes('"rank_novice"')) {
  console.log("Already injected.");
  process.exit(0);
}

for (const lang in ranks) {
  const langBlock = ranks[lang];
  let injectString = '';
  for (const key in langBlock) {
    injectString += `      "${key}": "${langBlock[key]}",\n`;
  }
  
  const searchString = `  "${lang}": {\n`;
  if (content.includes(searchString)) {
    content = content.replace(searchString, searchString + injectString);
    console.log(`Injected for ${lang}`);
  } else {
    console.log(`Language ${lang} block not found!`);
  }
}

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Done updating i18n.js");
