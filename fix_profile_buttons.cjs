const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": { buy_diamonds_title: "Elmas Satın Al", btn_buy: "Satın Al" },
  "en": { buy_diamonds_title: "Buy Diamonds", btn_buy: "Buy" },
  "ru": { buy_diamonds_title: "Купить алмазы", btn_buy: "Купить" },
  "es": { buy_diamonds_title: "Comprar Diamantes", btn_buy: "Comprar" },
  "fr": { buy_diamonds_title: "Acheter des Diamants", btn_buy: "Acheter" },
  "de": { buy_diamonds_title: "Diamanten kaufen", btn_buy: "Kaufen" },
  "pt": { buy_diamonds_title: "Comprar Diamantes", btn_buy: "Comprar" },
  "ar": { buy_diamonds_title: "شراء الماس", btn_buy: "شراء" },
  "zh": { buy_diamonds_title: "购买钻石", btn_buy: "购买" },
  "hi": { buy_diamonds_title: "हीरे खरीदें", btn_buy: "खरीदें" },
  "ur": { buy_diamonds_title: "ہیرے خریدیں", btn_buy: "خریدیں" }
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
    
    // Replace uppercase buy_diamonds_title
    if (inLang && lines[i].includes('"buy_diamonds_title":')) {
      lines[i] = `    "buy_diamonds_title": "${tr.buy_diamonds_title}",`;
    }
  }

  // Insert btn_buy if not exists
  if (insertIdx !== -1) {
    let hasBtnBuy = false;
    for (let i = insertIdx + 1; i < lines.length; i++) {
      if (lines[i].includes('"btn_buy":')) {
        hasBtnBuy = true;
        break;
      }
      if (lines[i].match(/^\s*\}/)) break;
    }
    if (!hasBtnBuy) {
       lines.splice(insertIdx + 1, 0, `    "btn_buy": "${tr.btn_buy}",`);
    }
  }
}

content = lines.join('\n');
fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Fixed buy diamonds uppercase and added btn_buy.");
