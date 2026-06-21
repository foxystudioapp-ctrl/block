const fs = require('fs');

// Fix classicBlock.js
let c = fs.readFileSync('src/screens/classicBlock.js', 'utf8');
c = c.replace(/!EKİ!/g, 'ÇEKİÇ');
c = c.replace(/"️/g, '♾️');
c = c.replace(/  computed/g, '- computed');
c = c.replace(/  cached/g, '- cached');
c = c.replace(/  \$\{currentLevel \+ 1\}/g, '➔ ${currentLevel + 1}');
c = c.replace(/x /g, 'x 🛠️'); // for hammer 
// Wait, I will just manually replace the undo and hammer modals to be safe.
c = c.replace(/!ekiç kullanmak için/g, 'Çekiç kullanmak için');
c = c.replace(/Reklam İzle & !ekiç Kullan/g, 'Reklam İzle & Çekiç Kullan');
c = c.replace(/K1rmak istedi iniz blo a dokunun/g, 'Kırmak istediğiniz bloğa dokunun');
c = c.replace(/Maksimum eki hakk1n1 doldurdun!/g, 'Maksimum çekiç hakkını doldurdun!');
fs.writeFileSync('src/screens/classicBlock.js', c, 'utf8');

// Fix multiplayerDuelMode.js
let m = fs.readFileSync('src/screens/multiplayerDuelMode.js', 'utf8');
m = m.replace(/^\uFFFDimport/g, 'import');
m = m.replace(/BLOK DÒ ELLOSU/g, 'BLOK DÜELLOSU');
m = m.replace(/RAKİP DSŞSNSYOR\.\.\./g, 'RAKİP DÜŞÜNÜYOR...');
m = m.replace(/Arkadaxına bu kodu gönder:/g, 'Arkadaşına bu kodu gönder:');
m = m.replace(/Oda kodu kopyalandÒ⬞ ±!/g, 'Oda kodu kopyalandı!');
m = m.replace(/Rakibin Baxlantısı Koptu/g, 'Rakibin Bağlantısı Koptu');
m = m.replace(/Rakibin sÒ  ¼resi doldu! SÒ⬞ ±ra sende\./g, 'Rakibin süresi doldu! Sıra sende.');
m = m.replace(/timer text span   avoid/g, 'timer text span - avoid');
// Fix the malformed JS line 320
m = m.replace(/import\('\.\.\/components\/toast\.js'\)\.then\(m => m\.import\('\.\.\/components\/toast\.js'\)\.then\(m => m\.Toast\.show\(t\('opponent_returned'\) \|\| 'Rakip geri dnd!', 'success'\)\);/, 
"import('../components/toast.js').then(m => m.Toast.show(t('opponent_returned') || 'Rakip geri döndü!', 'success'));");

fs.writeFileSync('src/screens/multiplayerDuelMode.js', m, 'utf8');
