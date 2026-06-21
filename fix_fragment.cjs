const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/askar/OneDrive/Masaüstü/block/src/screens';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const f of files) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('fragment.appendChild(cell)') && !content.includes('const fragment = document.createDocumentFragment()')) {
    console.log(f + ' is missing fragment declaration!');
    
    // Replace the innerHTML clearing with innerHTML + fragment
    content = content.replace(/boardEl\.innerHTML = '';/g, "boardEl.innerHTML = '';\n    const fragment = document.createDocumentFragment();");
    fs.writeFileSync(filePath, content);
    console.log(f + ' -> FIXED');
  }
}
