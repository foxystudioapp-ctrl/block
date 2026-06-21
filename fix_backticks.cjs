const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Remove backslash before backticks
  content = content.replace(/\\`/g, '`');
  // Remove backslash before dollar signs
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/screens/profile.js');
fixFile('src/screens/classicBlock.js');
console.log("Fixed backticks.");
