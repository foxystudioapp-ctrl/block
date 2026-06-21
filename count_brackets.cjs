const fs = require('fs');
const files = ['src/screens/duelMode.js', 'src/screens/multiplayerDuelMode.js'];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const opens = (content.match(/\{/g) || []).length;
  const closes = (content.match(/\}/g) || []).length;
  console.log(f, 'Opens:', opens, 'Closes:', closes, 'Diff (Open - Close):', opens - closes);
}
