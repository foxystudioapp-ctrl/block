const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/askar/OneDrive/Masaüstü/block/src/screens';
const files = ['hexBlock.js', 'duelMode.js', 'multiplayerDuelMode.js', 'mergeBlock.js', 'adventure.js'];

for (const f of files) {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/trayEl\.innerHTML = '';(\s*)engine\.activePieces\.forEach/g, "trayEl.innerHTML = '';\n    const fragment = document.createDocumentFragment();$1engine.activePieces.forEach");
  content = content.replace(/trayEl\.appendChild\(itemContainer\);/g, "fragment.appendChild(itemContainer);");
  
  // Find the end of renderTray
  content = content.replace(/\n\s*\}\);\n\s*\};\n/g, "\n    });\n    trayEl.appendChild(fragment);\n  };\n");

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Optimized tray in', f);
  }
}
