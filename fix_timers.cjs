const fs = require('fs');
const files = [
  'src/screens/x2Block.js',
  'src/screens/matchMode.js',
  'src/screens/classicBlock.js',
  'src/screens/hexBlock.js'
];

function processFile(file) {
  if (!fs.existsSync(file)) {
    console.log('File not found:', file);
    return;
  }
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add definitions at the top of the main function.
  content = content.replace(/(export function [a-zA-Z0-9_]+\([^)]*\)\s*\{)/, '$1\n  let timeoutIds = [];\n  let intervalIds = [];\n  let rafId;');

  // 2. Replace setTimeout and setInterval
  function wrapCalls(source, funcName, arrayName) {
    let result = '';
    let i = 0;
    while (i < source.length) {
      const idx = source.indexOf(funcName + '(', i);
      if (idx === -1) {
        result += source.slice(i);
        break;
      }
      
      // Check if it is already wrapped
      if (source.slice(Math.max(0, idx - 16), idx).includes(arrayName + '.push(')) {
         result += source.slice(i, idx + funcName.length);
         i = idx + funcName.length;
         continue;
      }
      
      result += source.slice(i, idx);
      result += arrayName + '.push(' + funcName;
      
      let parens = 0;
      let j = idx + funcName.length;
      for (; j < source.length; j++) {
        if (source[j] === '(') parens++;
        else if (source[j] === ')') {
          parens--;
          if (parens === 0) {
            result += source.slice(idx + funcName.length, j + 1) + ')';
            i = j + 1;
            break;
          }
        }
      }
    }
    return result;
  }

  content = wrapCalls(content, 'setTimeout', 'timeoutIds');
  content = wrapCalls(content, 'setInterval', 'intervalIds');

  // 3. Ensure requestAnimationFrame is assigned to rafId
  content = content.replace(/(rafId\s*=\s*)?requestAnimationFrame\(/g, 'rafId = requestAnimationFrame(');
  
  // 4. Add cleanup code
  const cleanupAdd = '\n    timeoutIds.forEach(id => clearTimeout(id));\n    intervalIds.forEach(id => clearInterval(id));\n    if (rafId) cancelAnimationFrame(rafId);';
  content = content.replace(/(container\.cleanup\s*=\s*\(\)\s*=>\s*\{)/, '$1' + cleanupAdd);

  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed:', file);
}

files.forEach(processFile);
