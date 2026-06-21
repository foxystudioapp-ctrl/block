const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const map = {
  "tr": {
    "tut_match_title": "Blok Patlatmaca",
    "tut_match_desc": "Aynı renkteki yan yana duran en az 2 bloğa tıklayarak onları patlat.",
    "tut_match_target_title": "Hedefleri Topla",
    "tut_match_target_desc": "Hamlen bitmeden yukarıdaki hedefleri toplayarak bölümü geç."
  },
  "en": {
    "tut_match_title": "Match Blocks",
    "tut_match_desc": "Click on at least 2 adjacent blocks of the same color to blast them.",
    "tut_match_target_title": "Collect Targets",
    "tut_match_target_desc": "Collect the targets above before you run out of moves to pass the level."
  },
  "ru": {
    "tut_match_title": "Соедини Блоки",
    "tut_match_desc": "Нажмите как минимум на 2 соседних блока одного цвета, чтобы взорвать их.",
    "tut_match_target_title": "Собери Цели",
    "tut_match_target_desc": "Соберите цели сверху, прежде чем закончатся ходы, чтобы пройти уровень."
  },
  "es": {
    "tut_match_title": "Conectar Bloques",
    "tut_match_desc": "Haz clic en al menos 2 bloques adyacentes del mismo color para destruirlos.",
    "tut_match_target_title": "Recoge Objetivos",
    "tut_match_target_desc": "Recoge los objetivos de arriba antes de quedarte sin movimientos para pasar el nivel."
  },
  "fr": {
    "tut_match_title": "Associer Blocs",
    "tut_match_desc": "Cliquez sur au moins 2 blocs adjacents de la même couleur pour les détruire.",
    "tut_match_target_title": "Objectifs",
    "tut_match_target_desc": "Récupérez les objectifs ci-dessus avant de manquer de coups pour passer le niveau."
  },
  "de": {
    "tut_match_title": "Blöcke Verbinden",
    "tut_match_desc": "Klicke auf mindestens 2 benachbarte Blöcke der gleichen Farbe, um sie zu sprengen.",
    "tut_match_target_title": "Ziele Sammeln",
    "tut_match_target_desc": "Sammle die Ziele oben, bevor dir die Züge ausgehen, um das Level zu bestehen."
  },
  "pt": {
    "tut_match_title": "Combinar Blocos",
    "tut_match_desc": "Clique em pelo menos 2 blocos adjacentes da mesma cor para explodi-los.",
    "tut_match_target_title": "Coletar Alvos",
    "tut_match_target_desc": "Colete os alvos acima antes de ficar sem movimentos para passar de nível."
  },
  "ar": {
    "tut_match_title": "مطابقة الكتل",
    "tut_match_desc": "انقر على كتلتين متجاورتين على الأقل من نفس اللون لتفجيرهم.",
    "tut_match_target_title": "جمع الأهداف",
    "tut_match_target_desc": "اجمع الأهداف أعلاه قبل أن تنفد تحركاتك لتجاوز المستوى."
  },
  "zh": {
    "tut_match_title": "连线方块",
    "tut_match_desc": "点击至少2个相邻的同色方块来消除它们。",
    "tut_match_target_title": "收集目标",
    "tut_match_target_desc": "在步数耗尽前收集上方的目标以通过关卡。"
  },
  "hi": {
    "tut_match_title": "ब्लॉक मैच",
    "tut_match_desc": "उन्हें ब्लास्ट करने के लिए एक ही रंग के कम से कम 2 आसन्न ब्लॉकों पर क्लिक करें।",
    "tut_match_target_title": "लक्ष्य एकत्र करें",
    "tut_match_target_desc": "स्तर पार करने के लिए चालें खत्म होने से पहले ऊपर के लक्ष्यों को एकत्र करें।"
  },
  "ur": {
    "tut_match_title": "بلاک میچ",
    "tut_match_desc": "انہیں اڑانے کے لیے ایک ہی رنگ کے کم از کم 2 ملحقہ بلاکس پر کلک کریں۔",
    "tut_match_target_title": "اہداف جمع کریں",
    "tut_match_target_desc": "لیول پاس کرنے کے لیے اپنی چالیں ختم ہونے سے پہلے اوپر دیے گئے اہداف کو جمع کریں۔"
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
console.log("Match translations injected.");
