const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

// The regex matches any broken string like:
// "key": "Some text {var
//     "extra_moves": "+2...",} more text",
// Let's just fix it by finding `{` followed by anything, then `\n`, then `"extra_moves"`, then `}`.
const brokenRegex = /\{([^}\n]*)\n\s*"extra_moves":\s*"[^"]+",\}/g;

content = content.replace(brokenRegex, '{$1}');

fs.writeFileSync('src/utils/i18n.js', content, 'utf8');
console.log("Fixed syntax in all languages");
