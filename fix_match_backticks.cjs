const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/screens/matchMode.js');
console.log("Fixed backticks in matchMode.");
