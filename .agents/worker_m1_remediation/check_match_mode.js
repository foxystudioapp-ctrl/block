const fs = require('fs');
const code = fs.readFileSync('src/screens/matchMode.js', 'utf8');

let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // Strip strings and regexes to avoid false positives
  let inString = null;
  let escape = false;
  for (let j = 0; j < line.length; j++) {
    let char = line[j];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    // Check brackets
    if (char === '{' || char === '[' || char === '(') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === '}' || char === ']' || char === ')') {
      if (stack.length === 0) {
        console.log(`Unmatched closing ${char} at line ${i + 1}, col ${j + 1}`);
      } else {
        let last = stack.pop();
        let match = (last.char === '{' && char === '}') ||
                    (last.char === '[' && char === ']') ||
                    (last.char === '(' && char === ')');
        if (!match) {
          console.log(`Mismatch: opened ${last.char} at line ${last.line}, col ${last.col} but closed with ${char} at line ${i + 1}, col ${j + 1}`);
        }
      }
    }
  }
}

while (stack.length > 0) {
  let last = stack.pop();
  console.log(`Unclosed ${last.char} opened at line ${last.line}, col ${last.col}`);
}
