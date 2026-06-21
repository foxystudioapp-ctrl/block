const fs = require('fs');
let c = fs.readFileSync('src/utils/i18n.js', 'utf8');

c = c.replace(/\};\s*",\s*\n/g, '};\n\n');

fs.writeFileSync('src/utils/i18n.js', c);
