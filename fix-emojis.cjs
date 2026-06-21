const fs = require('fs');
const path = require('path');

const replacements = {
  '🪙': '<span class="material-symbols-outlined fill text-yellow-500 text-[1em] align-middle">monetization_on</span>',
  '🔥': '<span class="material-symbols-outlined fill text-orange-500 text-[1em] align-middle">local_fire_department</span>',
  '✅': '<span class="material-symbols-outlined fill text-green-500 text-[1em] align-middle">check_circle</span>',
  '💎': '<span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span>',
  '👑': '<span class="material-symbols-outlined fill text-yellow-400 text-[1em] align-middle">workspace_premium</span>',
  '🥈': '<span class="material-symbols-outlined fill text-gray-400 text-[1em] align-middle">military_tech</span>',
  '🥉': '<span class="material-symbols-outlined fill text-orange-600 text-[1em] align-middle">military_tech</span>',
  '🎉': '<span class="material-symbols-outlined fill text-yellow-500 text-[1em] align-middle">celebration</span>',
  '🏆': '<span class="material-symbols-outlined fill text-yellow-500 text-[1em] align-middle">emoji_events</span>',
  '💣': '<span class="material-symbols-outlined fill text-red-500 text-[1em] align-middle">local_fire_department</span>'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [emoji, html] of Object.entries(replacements)) {
        if (content.includes(emoji)) {
          // Replace all occurrences
          content = content.split(emoji).join(html);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', fullPath);
      }
    }
  }
}

walk('src');
