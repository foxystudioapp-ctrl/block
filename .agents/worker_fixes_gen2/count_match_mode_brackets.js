const fs = require('fs');
const content = fs.readFileSync('c:/Users/askar/OneDrive/Masaüstü/block/src/screens/matchMode.js', 'utf8');

let depth = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let oldDepth = depth;
  for (let char of line) {
    if (char === '{') depth++;
    if (char === '}') depth--;
  }
  if (line.includes('container.cleanup') || line.includes('startGame') || line.includes('return () =>') || i < 120 || i > 1370) {
    console.log(`Line ${i + 1} (depth ${oldDepth} -> ${depth}): ${line.trim()}`);
  }
}
