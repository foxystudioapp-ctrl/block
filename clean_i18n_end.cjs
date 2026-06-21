const fs = require('fs');

let c = fs.readFileSync('src/utils/i18n.js', 'utf8');

// The file has "hi": { ... }, then some garbage like "code": "tr", then my appended block "export const availableLanguages".
// Let's find "hi": {
let hiIdx = c.lastIndexOf('"hi": {');
let hiEnd = c.indexOf('}', hiIdx);

// Delete everything between hiEnd and export const availableLanguages
let exportIdx = c.lastIndexOf('export const availableLanguages');

if (hiEnd !== -1 && exportIdx !== -1) {
    let clean = c.substring(0, hiEnd + 1) + '\n};\n\n' + c.substring(exportIdx);
    fs.writeFileSync('src/utils/i18n.js', clean);
}
