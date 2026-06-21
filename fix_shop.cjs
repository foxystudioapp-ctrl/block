const fs = require('fs');
let s = fs.readFileSync('src/components/shopModal.js', 'utf8');
s = s.replace(/\\`/g, '`');
s = s.replace(/GǬnlǬk Snr Doldu/g, 'Günlük Sınır Doldu');
s = s.replace(/Gnlk Snr Doldu/g, 'Günlük Sınır Doldu');
s = s.replace(/G\u01ECnl\u01ECk/g, 'Günlük');
s = s.replace(/\uFFFD/g, 'ı'); // replace replacement character with dotless i
fs.writeFileSync('src/components/shopModal.js', s);
