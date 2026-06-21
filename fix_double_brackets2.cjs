const fs = require('fs');
const file = 'src/screens/multiplayerDuelMode.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = /\}\s*\}\s*;\s*\}\s*\}\s*;/g;

const match = content.match(targetStr);
if (match) {
  content = content.replace(targetStr, '}\n  };');
  fs.writeFileSync(file, content);
  console.log('Fixed double brackets via regex');
} else {
  console.log('Regex did not match');
}
