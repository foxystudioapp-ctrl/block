const fs = require('fs');
let lines = fs.readFileSync('src/utils/i18n.js', 'utf8').split('\n');
let validLines = [];

const p1 = /^\s*export const translations\s*=\s*\{\s*$/;
const p2 = /^\s*};?\s*$/;
const p3 = /^\s*"[a-zA-Z0-9_-]+"\s*:\s*\{\s*$/;
const p4 = /^\s*\},?\s*$/;
const p5 = /^\s*"[a-zA-Z0-9_-]+"\s*:\s*".*?"(,|)\s*$/;
const p6 = /^\s*$/; // empty

for(let i=0; i<lines.length; i++) {
    let line = lines[i].replace(/\r$/, '');
    
    if (p1.test(line) || p2.test(line) || p3.test(line) || p4.test(line) || p5.test(line) || p6.test(line)) {
        validLines.push(line);
    } else {
        console.log('REMOVED: ' + line);
    }
}

// Fix missing commas before the end of the block 
for(let i=0; i<validLines.length; i++) {
   if (validLines[i].match(/^\s*\},?\s*$/)) {
       // Look back at the previous non-empty line
       for(let j=i-1; j>=0; j--) {
           if (validLines[j].trim() !== '') {
               // Remove trailing comma from the last item
               validLines[j] = validLines[j].replace(/,\s*$/, '');
               break;
           }
       }
   }
}

fs.writeFileSync('src/utils/i18n.js', validLines.join('\n'));
