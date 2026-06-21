const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.js', 'utf8');

// Find all occurrences of lines that start with a quote, then end with a newline without closing quote, and fix them.
// But it's easier to just strip literal newlines from strings, or just replace them with space.

let lines = content.split('\n');
let newLines = [];
let i = 0;
while (i < lines.length) {
    let line = lines[i];
    // Check if line looks like "key": "value...
    // but the value doesn't close with ",
    let match = line.match(/^\s*"[^"]+"\s*:\s*"(.*)/);
    if (match) {
        let val = match[1];
        if (!val.endsWith('",') && !val.endsWith('"') && !val.endsWith('",\r') && !val.endsWith('"\r')) {
            // It's a broken string that continues to next line!
            let nextLine = lines[i+1];
            // Remove the newline by combining them
            let combined = line.replace(/\r$/, '') + ' ' + nextLine.trim();
            // If it still doesn't end with ", add it
            if (!combined.endsWith('",') && !combined.endsWith('"')) {
                 // Try to see if it just needs closing quotes
                 if (!combined.includes('",')) {
                     combined = combined + '",';
                 }
            }
            newLines.push(combined);
            i += 2;
            continue;
        }
    }
    
    // Check for another case: A line that just has text and ends with ",
    if (!line.includes(':') && !line.includes('{') && !line.includes('}') && line.trim().length > 0) {
        // This is a lingering fragment, like "! 0 ",
        // Handled by the lookahead above usually, but if not, let's just comment it out.
        // Actually, let's let the script try running again
    }
    
    newLines.push(line);
    i++;
}

fs.writeFileSync('src/utils/i18n.js', newLines.join('\n'));
