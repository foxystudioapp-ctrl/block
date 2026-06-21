const fs = require('fs');

function drawCube(x, z, color) {
  const cx = x * 44; 
  const cy = x * 22 - z * 44;
  
  const top = `0,${cy-22} -44,${cy} 0,${cy+22} 44,${cy}`;
  const left = `-44,${cy} 0,${cy+22} 0,${cy+66} -44,${cy+44}`;
  const right = `0,${cy+22} 44,${cy} 44,${cy+44} 0,${cy+66}`;

  return `
    <g>
      <!-- Left Face -->
      <polygon points="${left}" fill="${color.left}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
      <!-- Right Face -->
      <polygon points="${right}" fill="${color.right}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
      <!-- Top Face -->
      <polygon points="${top}" fill="${color.top}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <!-- Inner Glow / Edge Highlight -->
      <polyline points="-44,${cy} 0,${cy+22} 44,${cy}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
      <line x1="0" y1="${cy+22}" x2="0" y2="${cy+66}" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    </g>
  `;
}

const cyan = { top: '#00ffff', left: '#00b3b3', right: '#008080' };
const purple = { top: '#d946ef', left: '#a21caf', right: '#701a75' };
const orange = { top: '#fb923c', left: '#ea580c', right: '#9a3412' };
const gold = { top: '#fde047', left: '#eab308', right: '#a16207' };

let cubes = [];

// X=0 (Leftmost, Highest)
cubes.push(drawCube(0, 0, cyan));
cubes.push(drawCube(0, 1, cyan));
cubes.push(drawCube(0, 2, cyan));
cubes.push(drawCube(0, 3, cyan));

// X=1
cubes.push(drawCube(1, 0, purple));
cubes.push(drawCube(1, 1, purple));
cubes.push(drawCube(1, 2, purple));

// X=2
cubes.push(drawCube(2, 0, orange));
cubes.push(drawCube(2, 1, orange));

// X=3 (Rightmost, Lowest)
cubes.push(drawCube(3, 0, gold));

const transX = 256 - 66;
const transY = 220 - (-11);

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <!-- Deep Space Premium Background -->
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1e103c"/>
      <stop offset="60%" stop-color="#090514"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="25" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <filter id="dropShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="15" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bg)" rx="112" ry="112"/>
  
  <!-- Backdrop ambient light -->
  <circle cx="256" cy="220" r="150" fill="#a855f7" opacity="0.4" filter="url(#glow)"/>

  <g transform="translate(${transX}, ${transY})" filter="url(#dropShadow)">
    ${cubes.join('\n')}
  </g>

  <!-- Premium Metallic Text -->
  <defs>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="51%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <text x="256" y="460" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="42" fill="url(#goldText)" text-anchor="middle" letter-spacing="10" filter="url(#glow)" opacity="0.6">ALL IN ONE</text>
  <text x="256" y="460" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="42" fill="url(#goldText)" text-anchor="middle" letter-spacing="10" stroke="#fff" stroke-width="1">ALL IN ONE</text>

</svg>`;

fs.writeFileSync('public/logo.svg', svg);
fs.writeFileSync('C:/Users/askar/.gemini/antigravity/brain/2646b208-4d7c-49ab-83e9-70e74c9484bd/premium_b_logo.svg', svg);
console.log('Isometric SVG generated!');
