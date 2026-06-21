const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

const additionsTr = 
    combo_good: 'Ýyi!',
    combo_awesome: 'Harika!',
    combo_excellent: 'Mükemmel!',
    combo_defeat: 'Yenilgi!',;

const additionsEn = 
    combo_good: 'Good!',
    combo_awesome: 'Awesome!',
    combo_excellent: 'Excellent!',
    combo_defeat: 'Defeat!',;

const additionsEs = 
    combo_good: '¡Bien!',
    combo_awesome: '¡Impresionante!',
    combo_excellent: '¡Excelente!',
    combo_defeat: '¡Derrota!',;

const additionsDe = 
    combo_good: 'Gut!',
    combo_awesome: 'Klasse!',
    combo_excellent: 'Exzellent!',
    combo_defeat: 'Niederlage!',;

const additionsFr = 
    combo_good: 'Bien!',
    combo_awesome: 'Génial!',
    combo_excellent: 'Excellent!',
    combo_defeat: 'Défaite!',;

const additionsIt = 
    combo_good: 'Bene!',
    combo_awesome: 'Fantastico!',
    combo_excellent: 'Eccellente!',
    combo_defeat: 'Sconfitta!',;

const additionsPt = 
    combo_good: 'Bom!',
    combo_awesome: 'Incrível!',
    combo_excellent: 'Excelente!',
    combo_defeat: 'Derrota!',;

const additionsRu = 
    combo_good: '??????!',
    combo_awesome: '???????!',
    combo_excellent: '???????!',
    combo_defeat: '?????????!',;

const additionsJa = 
    combo_good: '???!',
    combo_awesome: '???!',
    combo_excellent: '??????!',
    combo_defeat: '??!',;

const additionsKo = 
    combo_good: '???!',
    combo_awesome: '???!',
    combo_excellent: '????!',
    combo_defeat: '??!',;

const additionsZh = 
    combo_good: '??!',
    combo_awesome: '???!',
    combo_excellent: '???!',
    combo_defeat: '??!',;

const additionsAr = 
    combo_good: '???!',
    combo_awesome: '????!',
    combo_excellent: '?????!',
    combo_defeat: '?????!',;

const additionsHi = 
    combo_good: '?????!',
    combo_awesome: '???? ??????!',
    combo_excellent: '????????!',
    combo_defeat: '???!',;


content = content.replace(/(tr:\s*\{)/, '\' + additionsTr);
content = content.replace(/(en:\s*\{)/, '\' + additionsEn);
content = content.replace(/(es:\s*\{)/, '\' + additionsEs);
content = content.replace(/(de:\s*\{)/, '\' + additionsDe);
content = content.replace(/(fr:\s*\{)/, '\' + additionsFr);
content = content.replace(/(it:\s*\{)/, '\' + additionsIt);
content = content.replace(/(pt:\s*\{)/, '\' + additionsPt);
content = content.replace(/(ru:\s*\{)/, '\' + additionsRu);
content = content.replace(/(ja:\s*\{)/, '\' + additionsJa);
content = content.replace(/(ko:\s*\{)/, '\' + additionsKo);
content = content.replace(/(zh:\s*\{)/, '\' + additionsZh);
content = content.replace(/(ar:\s*\{)/, '\' + additionsAr);
content = content.replace(/(hi:\s*\{)/, '\' + additionsHi);

fs.writeFileSync('src/utils/i18n.js', content);
console.log('Added combo translations to i18n.js');

