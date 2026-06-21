const fs = require('fs');
const files = ['classicBlock.js', 'hexBlock.js', 'game2048.js', 'mergeBlock.js'];

files.forEach(f => {
  const p = 'src/screens/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/subControls\.className = 'px-4 py-2 flex items-center justify-between w-full z-30';/g, 
                "subControls.className = 'px-4 pt-5 pb-2 flex items-center justify-between w-full z-30';");
  fs.writeFileSync(p, c);
});
console.log('Padding fixed');
