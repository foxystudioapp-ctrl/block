const fs=require('fs'); 
let c=fs.readFileSync('src/utils/i18n.js', 'utf8'); 
let trStart = c.indexOf('"tr": {'); 
let trEnd = c.indexOf('"en": {'); 
let trBlock = c.substring(trStart, trEnd); 

// Let's do string replacement for the Turkish block
trBlock = trBlock.replace(/Sat1n/g, 'Satın');
trBlock = trBlock.replace(/a1a 1daki/g, 'aşağıdaki');
trBlock = trBlock.replace(/A_a 1daki/g, 'Aşağıdaki');
trBlock = trBlock.replace(/olu_turun/g, 'oluşturun');
trBlock = trBlock.replace(/kazan1rs1n1z/g, 'kazanırsınız');
trBlock = trBlock.replace(/a!/g, 'aç!');
trBlock = trBlock.replace(/Yak1nda/g, 'Yakında');
trBlock = trBlock.replace(/kard1n/g, 'çıkardın');
trBlock = trBlock.replace(/_ekilde/g, 'şekilde');
trBlock = trBlock.replace(/ay1r1n/g, 'ayırın');
trBlock = trBlock.replace(/bo_ tpe/g, 'boş tüpe');
trBlock = trBlock.replace(/blo un/g, 'bloğun');
trBlock = trBlock.replace(/stne/g, 'üstüne');
trBlock = trBlock.replace(/grevleri/g, 'görevleri');
trBlock = trBlock.replace(/y1ld1zlar1/g, 'yıldızları');
trBlock = trBlock.replace(/1zgaraya/g, 'ızgaraya');
trBlock = trBlock.replace(/yerle_tirerek/g, 'yerleştirerek');
trBlock = trBlock.replace(/Gnlk Grevler/g, 'Günlük Görevler');
trBlock = trBlock.replace(/sein/g, 'seçin');
trBlock = trBlock.replace(/Anlad1m/g, 'Anladım');
trBlock = trBlock.replace(/y1ld1z1/g, 'yıldızı');
trBlock = trBlock.replace(/dn/g, 'dön');
trBlock = trBlock.replace(/ok/g, 'çok');
trBlock = trBlock.replace(/sat1rlar/g, 'satırlar');
trBlock = trBlock.replace(/sat1r/g, 'satır');
trBlock = trBlock.replace(/0_/g, 'iş');
trBlock = trBlock.replace(//g, 'ç');
trBlock = trBlock.replace(/_/g, 'ş');

c = c.substring(0, trStart) + trBlock + c.substring(trEnd); 
fs.writeFileSync('src/utils/i18n.js', c);
