const fs = require('fs');
const lines = fs.readFileSync('src/screens/matchMode.js', 'utf8').split('\n');
const line310 = lines[309]; // 0-indexed line 310
console.log("Line 310 content:", JSON.stringify(line310));
console.log("Line 310 length:", line310.length);
for (let i = 0; i < line310.length; i++) {
  console.log(`char ${i}: ${JSON.stringify(line310[i])} (code: ${line310.charCodeAt(i).toString(16)})`);
}
