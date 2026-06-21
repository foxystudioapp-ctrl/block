const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

// The broken string format in each language block is:
// "need_diamonds_undo": "... {cost\n    "extra_moves": "+2...",} ..."
content = content.replace(/\{cost\n\s*"extra_moves":\s*"[^"]+",\}\s*/g, '{cost}');

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Fixed syntax in all languages");
