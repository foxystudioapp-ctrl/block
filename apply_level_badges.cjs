const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/askar/OneDrive/Masaüstü/block/src/screens/mainMenu.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Classic Adventure
const classicRegex = /<button id="btn-classic-adventure" class="([^"]+) flex items-center justify-center">([\s\S]*?)<\/button>/;
content = content.replace(classicRegex, (match, classes, inner) => {
  return `<button id="btn-classic-adventure" class="${classes} flex flex-col items-center justify-center">${inner.trim()}
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">\${t('level') || 'Seviye'} \${PlayerState.state.currentAdventureLevel}</span>
          </button>`;
});

// 2. Jewel Adventure
const jewelRegex = /<button id="btn-jewel-adventure" class="([^"]+) flex items-center justify-center">([\s\S]*?)<\/button>/;
content = content.replace(jewelRegex, (match, classes, inner) => {
  return `<button id="btn-jewel-adventure" class="${classes} flex flex-col items-center justify-center">${inner.trim()}
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">\${t('level') || 'Seviye'} \${PlayerState.state.jewelCrushLevel}</span>
          </button>`;
});

// 3. X2 Adventure
// We need to fetch the level first before rendering the modal string.
// Let's inject the x2Level variable before the modal creation for X2.
const x2ModalRegex = /(const modal = createModal\(\{\s*title: t\('menu_x2'\) \|\| 'X2 Block',\s*onClose: \(\) => \{\},\s*content: `)/;
content = content.replace(x2ModalRegex, `const x2State = Storage.get('x2_save_state');
    const x2Level = (x2State && x2State.level) ? x2State.level : 1;
    $1`);

const x2Regex = /<button id="btn-mode-adventure" class="([^"]+) flex items-center justify-center">([\s\S]*?)<\/button>/;
content = content.replace(x2Regex, (match, classes, inner) => {
  return `<button id="btn-mode-adventure" class="${classes} flex flex-col items-center justify-center">${inner.trim()}
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">\${t('level') || 'Seviye'} \${x2Level}</span>
          </button>`;
});

// 4. Sort Adventure
const sortRegex = /<button id="btn-sort-adventure" class="([^"]+) flex items-center justify-center gap-2">([\s\S]*?)<\/button>/;
content = content.replace(sortRegex, (match, classes, inner) => {
  // inner is:
  // <span class="material-symbols-outlined text-2xl">map</span>
  // <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
  return `<button id="btn-sort-adventure" class="${classes} flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              ${inner.trim()}
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">\${t('level') || 'Seviye'} \${PlayerState.state.sortAdventureLevel}</span>
          </button>`;
});

fs.writeFileSync(filePath, content);
console.log('Level badges applied to mainMenu.js!');
