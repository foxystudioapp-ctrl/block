const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

// The string "level_completed": "..." is messed up. It looks like:
// "level_completed": "Seviye {lvl, "rank_novice": "Çaylak" ... } tamamlandı!",
// It contains unescaped quotes which break the JSON/JS.
// We can use a regex to match from "level_completed": " up to the end of the line, and replace it manually.

const fixes = {
  tr: `"level_completed": "Seviye {lvl} tamamlandı!",`,
  en: `"level_completed": "Level {lvl} completed!",`,
  es: `"level_completed": "¡Nivel {lvl} completado!",`,
  de: `"level_completed": "Level {lvl} abgeschlossen!",`,
  fr: `"level_completed": "Niveau {lvl} terminé!",`,
  it: `"level_completed": "Livello {lvl} completato!",`,
  pt: `"level_completed": "Nível {lvl} concluído!",`,
  ru: `"level_completed": "Уровень {lvl} пройден!",`,
  ja: `"level_completed": "レベル {lvl} 完了！",`,
  ko: `"level_completed": "레벨 {lvl} 완료!",`,
  zh: `"level_completed": "级别 {lvl} 完成！",`,
  ar: `"level_completed": "تم إكمال المستوى {lvl}!",`,
  hi: `"level_completed": "स्तर {lvl} पूरा हुआ!",`
};

// Instead of regex, let's just read line by line. If a line starts with "level_completed":, we replace it.
const lines = content.split('\n');
let currentLang = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect language block
  const langMatch = line.match(/^\s*"([a-z]{2})":\s*\{/);
  if (langMatch) {
    currentLang = langMatch[1];
  }

  if (line.includes('"level_completed":')) {
    if (fixes[currentLang]) {
      lines[i] = `    ${fixes[currentLang]}`;
    } else {
      lines[i] = `    "level_completed": "Level {lvl} completed!",`;
    }
  }
}

fs.writeFileSync('src/utils/i18n.js', lines.join('\n'));
console.log('Fixed level_completed');
