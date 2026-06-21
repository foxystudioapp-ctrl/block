const fs = require('fs');
let svg = fs.readFileSync('assets/icon.svg', 'utf8');

// 1. Remove rounded corners from background to prevent black padding edges
svg = svg.replace(/<rect width=\"512\" height=\"512\" fill=\"url\(#bg\)\" rx=\"112\" ry=\"112\"\/>/g, '<rect width=\"512\" height=\"512\" fill=\"transparent\"\/>');
svg = svg.replace(/<rect width=\"512\" height=\"512\" fill=\"url\(#grid\)\" rx=\"112\" ry=\"112\"\/>/g, '');

// 2. Scale up the contents
// We wrap everything after the Base Elements in a group with transform.
// The Base elements end after the second rect.
const parts = svg.split('<!-- Volumetric Core Glow -->');
if (parts.length === 2) {
  let newSvg = parts[0] + '<!-- Volumetric Core Glow -->\n  <g transform=\"translate(-64, -64) scale(1.25)\">\n' + parts[1].replace('</svg>', '  </g>\n</svg>');
  fs.writeFileSync('assets/icon.svg', newSvg);
  console.log('Icon updated!');
} else {
  console.log('Could not split SVG properly');
}

