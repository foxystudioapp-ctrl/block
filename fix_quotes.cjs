const fs = require('fs');

let lines = fs.readFileSync('src/utils/i18n.js', 'utf8').split('\n');
let newLines = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if line looks like a translation string:  "key": "value",
    let match = line.match(/^(\s*"[^"]+"\s*:\s*")(.*)/);
    if (match) {
        let prefix = match[1];
        let rest = match[2];
        
        // Find the trailing part: ", or " at the very end
        let suffixMatch = rest.match(/(")(,?)\s*\r?$/);
        
        if (suffixMatch) {
            let suffix = suffixMatch[0];
            let value = rest.slice(0, -suffix.length);
            
            // Now escape any unescaped quotes inside the value
            // To be safe, we just replace all " with \" (unless they are already escaped)
            value = value.replace(/(?<!\\)"/g, '\\"');
            
            line = prefix + value + suffix;
        } else {
            // It doesn't have a clean suffix. We've probably already handled newlines.
            // Let's just escape all quotes in `rest` and slap a ", at the end just to be safe.
            let cleanRest = rest.replace(/\r$/, '');
            cleanRest = cleanRest.replace(/(?<!\\)"/g, '\\"');
            line = prefix + cleanRest + '",';
        }
    }
    
    newLines.push(line);
}

fs.writeFileSync('src/utils/i18n.js', newLines.join('\n'));
