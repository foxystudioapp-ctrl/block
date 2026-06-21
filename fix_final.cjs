const fs = require('fs');
let c = fs.readFileSync('src/utils/i18n.js', 'utf8');

c = c.replace(/"need_diamonds_undo": "Geri almak i.*?in \{cost\} \};/g, '"need_diamonds_undo": "Geri almak için {cost} elmasa ihtiyacınız var"\n  }\n};');

fs.writeFileSync('src/utils/i18n.js', c);
