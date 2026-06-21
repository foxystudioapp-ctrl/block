const fs = require('fs');

let c = fs.readFileSync('src/screens/classicBlock.js', 'utf8');
c = c.replace(/\uFFFD!EKİ\uFFFD!/g, 'ÇEKİÇ');
c = c.replace(/\uFFFD\"\uFFFD️/g, '♾️');
c = c.replace(/\uFFFD  computed/g, '- computed');
c = c.replace(/\uFFFD  cached/g, '- cached');
c = c.replace(/\uFFFD  \$\{currentLevel \+ 1\}/g, '➔ ${currentLevel + 1}');
c = c.replace(/x \uFFFD/g, 'x 🛠️');
c = c.replace(/\uFFFD!ekiç/g, 'Çekiç');
c = c.replace(/\uFFFDÇekiç/g, 'Çekiç');
c = c.replace(/Maksimum \uFFFDeki\uFFFD hakk1n1 doldurdun!/g, 'Maksimum çekiç hakkını doldurdun!');
fs.writeFileSync('src/screens/classicBlock.js', c);

let m = fs.readFileSync('src/screens/multiplayerDuelMode.js', 'utf8');
m = m.replace(/\uFFFD/g, ''); // Just strip all remaining \ufffd from multiplayer to clean it
fs.writeFileSync('src/screens/multiplayerDuelMode.js', m);

