const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/askar/OneDrive/Masaüstü/block/src/screens';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let totalOptimized = 0;

for (const f of files) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  const regex = /cell\.className = ('[^']+');\s*cell\.style\.width = [^;]+;\s*cell\.style\.height = [^;]+;\s*if\s*\((newColor|color)\s*===\s*'inactive'\)\s*\{\s*cell\.className \+=\s*('[^']+');\s*\}\s*else\s*if\s*\((newColor|color)\)\s*\{\s*cell\.className \+=\s*(`[^`]+`|'[^']+');\s*\}\s*else\s*\{\s*cell\.className \+=\s*('[^']+');\s*\}/g;

  content = content.replace(regex, (match, baseClass, var1, inactiveAdd, var2, colorAdd, emptyAdd) => {
    const colorVar = var1; // 'newColor' or 'color'
    
    return `
      const oldColor = prevBoardSnapshot && prevBoardSnapshot[r] ? prevBoardSnapshot[r][c] : undefined;
      
      // Remove old classes if we have snapshot
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
        // Fallback if prev snapshot is missing
        cell.className = ${baseClass};
      }

      cell.style.width = \`\${cachedCellWidth}px\`;
      cell.style.height = \`\${cachedCellWidth}px\`;

      // Add new classes
      if (${colorVar} === 'inactive') {
        cell.classList.add(...(${inactiveAdd}.trim().split(' ')));
      } else if (${colorVar}) {
        const newColorStr = ${colorAdd};
        cell.classList.add(...(newColorStr.trim().split(' ')));
      } else {
        cell.classList.add(...(${emptyAdd}.trim().split(' ')));
      }
    `;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Optimized updateBoardUI in', f);
    totalOptimized++;
  }
}

console.log('Total files optimized:', totalOptimized);
