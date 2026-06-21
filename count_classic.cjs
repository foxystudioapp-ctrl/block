const fs = require('fs');
const file = 'src/screens/classicBlock.js';
let content = fs.readFileSync(file, 'utf8');

let depth = 0;
let lastZeroIndex = -1;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') depth++;
  if (content[i] === '}') {
    depth--;
    if (depth === 0) {
      console.log('Depth hit 0 at index', i, 'near', content.substring(Math.max(0, i-30), i+30));
    }
  }
}
console.log('Final depth:', depth);
