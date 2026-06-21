const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": { watch_ad_earn: "Reklam İzle & 100 Kazan", diamonds_500: "500 Elmas", diamonds_1000: "1,000 Elmas", diamonds_2000: "2,000 Elmas", diamonds_5000: "5,000 Elmas", diamonds_10000: "10,000 Elmas", buy_diamonds_title: "ELMAS SATIN AL", ad_limit_reached: "Günlük Sınır Doldu" },
  "en": { watch_ad_earn: "Watch Ad & Earn 100", diamonds_500: "500 Diamonds", diamonds_1000: "1,000 Diamonds", diamonds_2000: "2,000 Diamonds", diamonds_5000: "5,000 Diamonds", diamonds_10000: "10,000 Diamonds", buy_diamonds_title: "BUY DIAMONDS", ad_limit_reached: "Daily Limit Reached" },
  "ru": { watch_ad_earn: "Смотреть и 100 алмазов", diamonds_500: "500 Алмазов", diamonds_1000: "1,000 Алмазов", diamonds_2000: "2,000 Алмазов", diamonds_5000: "5,000 Алмазов", diamonds_10000: "10,000 Алмазов", buy_diamonds_title: "КУПИТЬ АЛМАЗЫ", ad_limit_reached: "Дневной лимит исчерпан" },
  "es": { watch_ad_earn: "Ver Anuncio y Ganar 100", diamonds_500: "500 Diamantes", diamonds_1000: "1,000 Diamantes", diamonds_2000: "2,000 Diamantes", diamonds_5000: "5,000 Diamantes", diamonds_10000: "10,000 Diamantes", buy_diamonds_title: "COMPRAR DIAMANTES", ad_limit_reached: "Límite Diario Alcanzado" },
  "fr": { watch_ad_earn: "Voir pub et Gagner 100", diamonds_500: "500 Diamants", diamonds_1000: "1,000 Diamants", diamonds_2000: "2,000 Diamants", diamonds_5000: "5,000 Diamants", diamonds_10000: "10,000 Diamants", buy_diamonds_title: "ACHETER DES DIAMANTS", ad_limit_reached: "Limite Quotidienne Atteinte" },
  "de": { watch_ad_earn: "Video ansehen & 100", diamonds_500: "500 Diamanten", diamonds_1000: "1,000 Diamanten", diamonds_2000: "2,000 Diamanten", diamonds_5000: "5,000 Diamanten", diamonds_10000: "10,000 Diamanten", buy_diamonds_title: "DIAMANTEN KAUFEN", ad_limit_reached: "Tageslimit erreicht" },
  "pt": { watch_ad_earn: "Assistir e Ganhar 100", diamonds_500: "500 Diamantes", diamonds_1000: "1,000 Diamantes", diamonds_2000: "2,000 Diamantes", diamonds_5000: "5,000 Diamantes", diamonds_10000: "10,000 Diamantes", buy_diamonds_title: "COMPRAR DIAMANTES", ad_limit_reached: "Limite Diário Atingido" },
  "ar": { watch_ad_earn: "شاهد إعلان واربح 100", diamonds_500: "500 ماسة", diamonds_1000: "1,000 ماسة", diamonds_2000: "2,000 ماسة", diamonds_5000: "5,000 ماسة", diamonds_10000: "10,000 ماسة", buy_diamonds_title: "شراء الماس", ad_limit_reached: "تم الوصول للحد اليومي" },
  "zh": { watch_ad_earn: "看广告得 100 钻石", diamonds_500: "500 钻石", diamonds_1000: "1,000 钻石", diamonds_2000: "2,000 钻石", diamonds_5000: "5,000 钻石", diamonds_10000: "10,000 钻石", buy_diamonds_title: "购买钻石", ad_limit_reached: "已达每日上限" },
  "hi": { watch_ad_earn: "विज्ञापन देखें और 100 जीतें", diamonds_500: "500 हीरे", diamonds_1000: "1,000 हीरे", diamonds_2000: "2,000 हीरे", diamonds_5000: "5,000 हीरे", diamonds_10000: "10,000 हीरे", buy_diamonds_title: "हीरे खरीदें", ad_limit_reached: "दैनिक सीमा समाप्त" },
  "ur": { watch_ad_earn: "اشتہار دیکھیں اور 100 جیتیں", diamonds_500: "500 ہیرے", diamonds_1000: "1,000 ہیرے", diamonds_2000: "2,000 ہیرے", diamonds_5000: "5,000 ہیرے", diamonds_10000: "10,000 ہیرے", buy_diamonds_title: "ہیرے خریدیں", ad_limit_reached: "روزانہ کی حد پوری ہو گئی" }
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
    // Attempt to insert near the top of language block
    for (let i = insertIdx + 1; i < lines.length; i++) {
       lines.splice(i, 0, 
         `    "watch_ad_earn": "${tr.watch_ad_earn}",`,
         `    "diamonds_500": "${tr.diamonds_500}",`,
         `    "diamonds_1000": "${tr.diamonds_1000}",`,
         `    "diamonds_2000": "${tr.diamonds_2000}",`,
         `    "diamonds_5000": "${tr.diamonds_5000}",`,
         `    "diamonds_10000": "${tr.diamonds_10000}",`,
         `    "buy_diamonds_title": "${tr.buy_diamonds_title}",`,
         `    "ad_limit_reached": "${tr.ad_limit_reached}",`
       );
       added = true;
       break;
    }
  }
}

content = lines.join('\n');
fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Updated diamond purchase strings in all languages.");
