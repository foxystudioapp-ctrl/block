const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/utils/i18n.js');
let text = fs.readFileSync(file, 'utf8');

// Fix the corrupted parts:
// It looks like:
// ,
//     "save": "Kaydet",
//     "edit_name": "İsmini Değiştir"
//   
//   }
// We will use a regex to find all instances of this exact injection block and replace it with `}`

const badRegex = /,\s*"save":\s*"[^"]*",\s*"edit_name":\s*"[^"]*"\s*\n\s*\}/g;

text = text.replace(badRegex, '}');

// Now let's properly append the translations
const additions = {
  tr: { "save": "Kaydet", "edit_name": "İsmini Değiştir" },
  en: { "save": "Save", "edit_name": "Edit Name" },
  es: { "save": "Guardar", "edit_name": "Editar Nombre" },
  fr: { "save": "Enregistrer", "edit_name": "Modifier le Nom" },
  de: { "save": "Speichern", "edit_name": "Name bearbeiten" },
  it: { "save": "Salva", "edit_name": "Modifica Nome" },
  pt: { "save": "Salvar", "edit_name": "Editar Nome" },
  ru: { "save": "Сохранить", "edit_name": "Изменить имя" },
  ja: { "save": "保存", "edit_name": "名前を編集" },
  ar: { "save": "حفظ", "edit_name": "تعديل الاسم" },
  zh: { "save": "保存", "edit_name": "编辑名字" },
  hi: { "save": "सहेजें", "edit_name": "नाम संपादित करें" },
  ko: { "save": "저장", "edit_name": "이름 편집" }
};

for (const lang of Object.keys(additions)) {
  const searchString = `"${lang}": {`;
  const idx = text.indexOf(searchString);
  if (idx !== -1) {
    // Find the NEXT language block or the end of the translations object
    // A safe way is to find the LAST closing brace before the next language starts
    let nextLangIdx = text.length;
    for (const otherLang of Object.keys(additions)) {
       if (otherLang === lang) continue;
       const otherIdx = text.indexOf(`"${otherLang}": {`);
       if (otherIdx > idx && otherIdx < nextLangIdx) {
          nextLangIdx = otherIdx;
       }
    }
    
    const chunk = text.slice(idx, nextLangIdx);
    const lastBraceIdx = chunk.lastIndexOf('}');
    if (lastBraceIdx !== -1) {
       let newChunk = chunk;
       for (const [k, v] of Object.entries(additions[lang])) {
         if (!newChunk.includes(`"${k}"`)) {
            // Insert right before the last closing brace
            const insertPos = newChunk.lastIndexOf('}');
            // check if there's a comma before it
            let hasComma = false;
            let cursor = insertPos - 1;
            while(cursor >= 0 && /\s/.test(newChunk[cursor])) cursor--;
            if (newChunk[cursor] === ',') hasComma = true;
            
            const insertStr = (hasComma ? '' : ',') + `\n    "${k}": "${v}"\n  `;
            newChunk = newChunk.slice(0, insertPos) + insertStr + newChunk.slice(insertPos);
         }
       }
       text = text.slice(0, idx) + newChunk + text.slice(nextLangIdx);
    }
  }
}

fs.writeFileSync(file, text, 'utf8');
console.log("Fixed and updated!");
