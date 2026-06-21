const fs = require('fs');

const p = 'src/utils/i18n.js';
let c = fs.readFileSync(p, 'utf8');

const shopTrans = {
  tr: {
    shop_title: "DÜKKAN",
    shop_balance: "Bakiye",
    shop_unlocked: "Açık",
    shop_use: "Kullan",
    shop_selected: "Seçili",
    shop_buy: "Satın Al",
    shop_buy_title: "Satın Al?",
    shop_buy_desc: "{name} için {price} elmas öde?",
    shop_bought_toast: "Satın Alındı!",
    shop_default: "Klasik Mavi",
    shop_forest: "Orman Yeşili",
    shop_sunset: "Gün Batımı",
    shop_neon: "Neon",
    shop_royal: "Kraliyet Moru",
    buy_diamonds_title: "Elmas Satın Al",
    diamonds_500: "500 Elmas",
    diamonds_1000: "1,000 Elmas",
    diamonds_2000: "2,000 Elmas",
    diamonds_5000: "5,000 Elmas",
    diamonds_10000: "10,000 Elmas",
    watch_ad_earn: "Reklam İzle & 200 Elmas Kazan",
    ad_limit_reached: "Günlük Sınır Doldu"
  },
  en: {
    shop_title: "SHOP",
    shop_balance: "Balance",
    shop_unlocked: "Unlocked",
    shop_use: "Use",
    shop_selected: "Selected",
    shop_buy: "Buy",
    shop_buy_title: "Buy?",
    shop_buy_desc: "Buy {name} for {price} diamonds?",
    shop_bought_toast: "Bought!",
    shop_default: "Classic Blue",
    shop_forest: "Forest Green",
    shop_sunset: "Sunset",
    shop_neon: "Neon",
    shop_royal: "Royal Purple",
    buy_diamonds_title: "Buy Diamonds",
    diamonds_500: "500 Diamonds",
    diamonds_1000: "1,000 Diamonds",
    diamonds_2000: "2,000 Diamonds",
    diamonds_5000: "5,000 Diamonds",
    diamonds_10000: "10,000 Diamonds",
    watch_ad_earn: "Watch Ad & Earn 200 Diamonds",
    ad_limit_reached: "Daily Limit Reached"
  },
  es: {
    shop_title: "TIENDA",
    shop_balance: "Saldo",
    shop_unlocked: "Desbloqueado",
    shop_use: "Usar",
    shop_selected: "Seleccionado",
    shop_buy: "Comprar",
    shop_buy_title: "¿Comprar?",
    shop_buy_desc: "¿Comprar {name} por {price} diamantes?",
    shop_bought_toast: "¡Comprado!",
    shop_default: "Azul Clásico",
    shop_forest: "Verde Bosque",
    shop_sunset: "Atardecer",
    shop_neon: "Neón",
    shop_royal: "Púrpura Real",
    buy_diamonds_title: "Comprar Diamantes",
    diamonds_500: "500 Diamantes",
    diamonds_1000: "1,000 Diamantes",
    diamonds_2000: "2,000 Diamantes",
    diamonds_5000: "5,000 Diamantes",
    diamonds_10000: "10,000 Diamantes",
    watch_ad_earn: "Ver anuncio y ganar 200",
    ad_limit_reached: "Límite diario alcanzado"
  },
  fr: {
    shop_title: "BOUTIQUE",
    shop_balance: "Solde",
    shop_unlocked: "Débloqué",
    shop_use: "Utiliser",
    shop_selected: "Sélectionné",
    shop_buy: "Acheter",
    shop_buy_title: "Acheter ?",
    shop_buy_desc: "Acheter {name} pour {price} diamants ?",
    shop_bought_toast: "Acheté !",
    shop_default: "Bleu Classique",
    shop_forest: "Vert Forêt",
    shop_sunset: "Coucher de soleil",
    shop_neon: "Néon",
    shop_royal: "Violet Royal",
    buy_diamonds_title: "Acheter des Diamants",
    diamonds_500: "500 Diamants",
    diamonds_1000: "1,000 Diamants",
    diamonds_2000: "2,000 Diamants",
    diamonds_5000: "5,000 Diamants",
    diamonds_10000: "10,000 Diamants",
    watch_ad_earn: "Voir une pub (200)",
    ad_limit_reached: "Limite atteinte"
  },
  de: {
    shop_title: "SHOP",
    shop_balance: "Guthaben",
    shop_unlocked: "Freigeschaltet",
    shop_use: "Verwenden",
    shop_selected: "Ausgewählt",
    shop_buy: "Kaufen",
    shop_buy_title: "Kaufen?",
    shop_buy_desc: "{name} für {price} Diamanten kaufen?",
    shop_bought_toast: "Gekauft!",
    shop_default: "Klassik Blau",
    shop_forest: "Waldgrün",
    shop_sunset: "Sonnenuntergang",
    shop_neon: "Neon",
    shop_royal: "Königsblau",
    buy_diamonds_title: "Diamanten Kaufen",
    diamonds_500: "500 Diamanten",
    diamonds_1000: "1.000 Diamanten",
    diamonds_2000: "2.000 Diamanten",
    diamonds_5000: "5.000 Diamanten",
    diamonds_10000: "10.000 Diamanten",
    watch_ad_earn: "Video ansehen & 200 erhalten",
    ad_limit_reached: "Tageslimit erreicht"
  },
  it: {
    shop_title: "NEGOZIO",
    shop_balance: "Saldo",
    shop_unlocked: "Sbloccato",
    shop_use: "Usa",
    shop_selected: "Selezionato",
    shop_buy: "Compra",
    shop_buy_title: "Comprare?",
    shop_buy_desc: "Comprare {name} per {price} diamanti?",
    shop_bought_toast: "Comprato!",
    shop_default: "Blu Classico",
    shop_forest: "Verde Foresta",
    shop_sunset: "Tramonto",
    shop_neon: "Neon",
    shop_royal: "Viola Reale",
    buy_diamonds_title: "Compra Diamanti",
    diamonds_500: "500 Diamanti",
    diamonds_1000: "1.000 Diamanti",
    diamonds_2000: "2.000 Diamanti",
    diamonds_5000: "5.000 Diamanti",
    diamonds_10000: "10.000 Diamanti",
    watch_ad_earn: "Guarda video (200)",
    ad_limit_reached: "Limite raggiunto"
  },
  pt: {
    shop_title: "LOJA",
    shop_balance: "Saldo",
    shop_unlocked: "Desbloqueado",
    shop_use: "Usar",
    shop_selected: "Selecionado",
    shop_buy: "Comprar",
    shop_buy_title: "Comprar?",
    shop_buy_desc: "Comprar {name} por {price} diamantes?",
    shop_bought_toast: "Comprado!",
    shop_default: "Azul Clássico",
    shop_forest: "Verde Floresta",
    shop_sunset: "Pôr do Sol",
    shop_neon: "Neon",
    shop_royal: "Roxo Real",
    buy_diamonds_title: "Comprar Diamantes",
    diamonds_500: "500 Diamantes",
    diamonds_1000: "1.000 Diamantes",
    diamonds_2000: "2.000 Diamantes",
    diamonds_5000: "5.000 Diamantes",
    diamonds_10000: "10.000 Diamantes",
    watch_ad_earn: "Ver anúncio e ganhar 200",
    ad_limit_reached: "Limite alcançado"
  },
  ru: {
    shop_title: "МАГАЗИН",
    shop_balance: "Баланс",
    shop_unlocked: "Открыто",
    shop_use: "Использовать",
    shop_selected: "Выбрано",
    shop_buy: "Купить",
    shop_buy_title: "Купить?",
    shop_buy_desc: "Купить {name} за {price} алмазов?",
    shop_bought_toast: "Куплено!",
    shop_default: "Классический Синий",
    shop_forest: "Лесной Зеленый",
    shop_sunset: "Закат",
    shop_neon: "Неон",
    shop_royal: "Королевский Пурпур",
    buy_diamonds_title: "Купить Алмазы",
    diamonds_500: "500 Алмазов",
    diamonds_1000: "1,000 Алмазов",
    diamonds_2000: "2,000 Алмазов",
    diamonds_5000: "5,000 Алмазов",
    diamonds_10000: "10,000 Алмазов",
    watch_ad_earn: "Смотреть рекламу (200)",
    ad_limit_reached: "Лимит достигнут"
  },
  ar: {
    shop_title: "المتجر",
    shop_balance: "الرصيد",
    shop_unlocked: "مفتوح",
    shop_use: "استخدام",
    shop_selected: "محدد",
    shop_buy: "شراء",
    shop_buy_title: "شراء؟",
    shop_buy_desc: "شراء {name} مقابل {price} ماسة؟",
    shop_bought_toast: "تم الشراء!",
    shop_default: "أزرق كلاسيكي",
    shop_forest: "أخضر غابة",
    shop_sunset: "غروب",
    shop_neon: "نيون",
    shop_royal: "أرجواني ملكي",
    buy_diamonds_title: "شراء الماس",
    diamonds_500: "500 ماسة",
    diamonds_1000: "1,000 ماسة",
    diamonds_2000: "2,000 ماسة",
    diamonds_5000: "5,000 ماسة",
    diamonds_10000: "10,000 ماسة",
    watch_ad_earn: "شاهد الإعلان (200)",
    ad_limit_reached: "تم الوصول للحد اليومي"
  },
  ja: {
    shop_title: "ショップ",
    shop_balance: "残高",
    shop_unlocked: "アンロック済",
    shop_use: "使用する",
    shop_selected: "選択中",
    shop_buy: "購入する",
    shop_buy_title: "購入しますか？",
    shop_buy_desc: "{price}ダイヤで{name}を購入しますか？",
    shop_bought_toast: "購入しました！",
    shop_default: "クラシックブルー",
    shop_forest: "フォレストグリーン",
    shop_sunset: "サンセット",
    shop_neon: "ネオン",
    shop_royal: "ロイヤルパープル",
    buy_diamonds_title: "ダイヤを購入",
    diamonds_500: "500 ダイヤ",
    diamonds_1000: "1,000 ダイヤ",
    diamonds_2000: "2,000 ダイヤ",
    diamonds_5000: "5,000 ダイヤ",
    diamonds_10000: "10,000 ダイヤ",
    watch_ad_earn: "動画を見て200ダイヤ",
    ad_limit_reached: "1日の上限に達しました"
  },
  hi: {
    shop_title: "दुकान",
    shop_balance: "बैलेंस",
    shop_unlocked: "अनलॉक",
    shop_use: "उपयोग करें",
    shop_selected: "चयनित",
    shop_buy: "खरीदें",
    shop_buy_title: "खरीदें?",
    shop_buy_desc: "क्या आप {price} हीरे के लिए {name} खरीदना चाहते हैं?",
    shop_bought_toast: "खरीदा गया!",
    shop_default: "क्लासिक ब्लू",
    shop_forest: "फॉरेस्ट ग्रीन",
    shop_sunset: "सनसेट",
    shop_neon: "नियॉन",
    shop_royal: "रॉयल पर्पल",
    buy_diamonds_title: "हीरे खरीदें",
    diamonds_500: "500 हीरे",
    diamonds_1000: "1,000 हीरे",
    diamonds_2000: "2,000 हीरे",
    diamonds_5000: "5,000 हीरे",
    diamonds_10000: "10,000 हीरे",
    watch_ad_earn: "विज्ञापन देखें (200)",
    ad_limit_reached: "दैनिक सीमा पूरी हुई"
  }
};

const keysToRemove = [
  "shop_title", "shop_balance", "shop_unlocked", "shop_use", "shop_selected",
  "shop_buy", "shop_buy_title", "shop_buy_desc", "shop_bought_toast",
  "shop_default", "shop_forest", "shop_sunset", "shop_neon", "shop_royal",
  "buy_diamonds_title", "diamonds_500", "diamonds_1000", "diamonds_2000", "diamonds_5000", "diamonds_10000",
  "watch_ad_earn", "ad_limit_reached"
];

let langs = Object.keys(shopTrans);

langs.forEach(lang => {
  keysToRemove.forEach(k => {
    let re = new RegExp('"' + k + '":\\s*".*?",?', 'g');
    c = c.replace(re, '');
  });
  
  const startIdx = c.indexOf('"' + lang + '": {');
  if (startIdx !== -1) {
    const nextLangIdx = c.indexOf('},', startIdx);
    if (nextLangIdx !== -1) {
      const section = c.substring(startIdx, nextLangIdx);
      
      let newKeys = "";
      for (const [k, v] of Object.entries(shopTrans[lang])) {
        newKeys += '    "' + k + '": "' + v + '",\n';
      }
      
      let updatedSection = section.replace(/(.*)(\s*)$/s, "$1,\n" + newKeys + "$2");
      updatedSection = updatedSection.replace(/,,/g, ',');
      c = c.replace(section, updatedSection);
    }
  }
});

// Remove trailing commas before closing braces if they were left
c = c.replace(/,\s*\}/g, '\n  }');

fs.writeFileSync(p, c, 'utf8');
