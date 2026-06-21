const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/askar/OneDrive/Masaüstü/block/src/screens';
const files = ['classicBlock.js', 'hexBlock.js', 'duelMode.js', 'multiplayerDuelMode.js', 'mergeBlock.js', 'adventure.js'];

for (const f of files) {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. renderTray - use DocumentFragment
  if (content.includes('function renderTray() {') && content.includes('trayEl.innerHTML = \'\';')) {
    // Inject fragment creation
    content = content.replace(/trayEl\.innerHTML = '';(\s*)engine\.activePieces\.forEach/g, "trayEl.innerHTML = '';\n    const fragment = document.createDocumentFragment();$1engine.activePieces.forEach");
    // Replace appendChild
    content = content.replace(/trayEl\.appendChild\(itemContainer\);/g, "fragment.appendChild(itemContainer);");
    
    // We need to insert `trayEl.appendChild(fragment);` after `engine.activePieces.forEach(...});`
    // Let's find the position.
    // The forEach usually ends near the end of renderTray function.
    // Let's find: `    });\n  };`
    // Or we can just use regex.
    content = content.replace(/\n    \}\);\n  \};\n/g, "\n    });\n    trayEl.appendChild(fragment);\n  };\n");
    content = content.replace(/\n    \}\);\n  \}/g, "\n    });\n    trayEl.appendChild(fragment);\n  }");
  }

  // 2. updateBoardUI - fix class list additions
  if (content.includes('function updateBoardUI() {')) {
    // Instead of doing complex parsing, replace cell.className = ... completely
    // We will find `cell.className = 'aspect-square rounded-lg flex items-center justify-center transition-all duration-200';`
    const classResetMatch = content.match(/cell\.className = ('aspect-square[^']+');/);
    if (classResetMatch) {
      const baseClass = classResetMatch[1];
      
      const regex = new RegExp(`cell\\.className = ${baseClass.replace(/([.{}()|^$?*+])/g, "\\$1")};\\s*cell\\.style\\.width = [^;]+;\\s*cell\\.style\\.height = [^;]+;\\s*if\\s*\\((newColor|color)\\s*===\\s*'inactive'\\)\\s*\\{\\s*cell\\.className \\+=\\s*('[^']+');\\s*\\}\\s*else\\s*if\\s*\\((newColor|color)\\)\\s*\\{\\s*cell\\.className \\+=\\s*(\`[^\`]+\`|'[^']+');\\s*\\}\\s*else\\s*\\{\\s*cell\\.className \\+=\\s*('[^']+');\\s*\\}`, 'g');
      
      content = content.replace(regex, (match, var1, inactiveAdd, var2, colorAdd, emptyAdd) => {
        const colorVar = var1;
        return `
      const oldColor = prevBoardSnapshot && prevBoardSnapshot[r] ? prevBoardSnapshot[r][c] : undefined;
      
      if (oldColor !== undefined) {
        if (oldColor === 'inactive') {
          cell.classList.remove(...(${inactiveAdd}.trim().split(' ')));
        } else if (oldColor) {
          const oldColorStr = ${colorAdd.replace(new RegExp('\\$\\{'+colorVar+'\\}', 'g'), '${oldColor}')};
          cell.classList.remove(...(oldColorStr.trim().split(' ')));
        } else if (oldColor === null || oldColor === 0) {
          cell.classList.remove(...(${emptyAdd}.trim().split(' ')));
        }
      } else {
        cell.className = ${baseClass};
      }

      cell.style.width = \`\${cachedCellWidth}px\`;
      cell.style.height = \`\${cachedCellWidth}px\`;

      if (${colorVar} === 'inactive') {
        cell.classList.add(...(${inactiveAdd}.trim().split(' ')));
      } else if (${colorVar}) {
        const newColorStr = ${colorAdd};
        cell.classList.add(...(newColorStr.trim().split(' ')));
      } else {
        cell.classList.add(...(${emptyAdd}.trim().split(' ')));
      }
        `.trim();
      });
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Optimized', f);
  } else {
    console.log('No changes applied for', f);
  }
}
