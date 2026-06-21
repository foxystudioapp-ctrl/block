const fs = require('fs');
const file = 'src/screens/multiplayerDuelMode.js';
let content = fs.readFileSync(file, 'utf8');

// Find all { and } to trace the mismatch
let depth = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') depth++;
  if (content[i] === '}') {
    depth--;
    if (depth < 0) {
      console.log('Found unmatched } at index', i, 'near', content.substring(i-50, i+50));
      // Remove it
      content = content.substring(0, i) + content.substring(i+1);
      fs.writeFileSync(file, content);
      console.log('Fixed extra }');
      break;
    }
  }
}
