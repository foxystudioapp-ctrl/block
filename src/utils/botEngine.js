import { avatarOptions } from './avatars.js';

// 11 Farklı Dilde Gerçekçi İsim Havuzu
const NAMES_11_LANGS = [
  // Türkçe
  "Ahmet", "Mehmet", "Ayşe", "Fatma", "Burak", "Kaan", "Zeynep", "Elif", "Emre", "Cem", 
  // İngilizce
  "Alex", "Sam", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Charlie", "Avery", "Parker",
  // Fransızca
  "Lucas", "Hugo", "Leo", "Jade", "Emma", "Chloe", "Gabin", "Louis", "Raphael", "Mia",
  // Almanca
  "Maximilian", "Leon", "Paul", "Elias", "Mia", "Emma", "Hannah", "Sofia", "Finn", "Noah",
  // İtalyanca
  "Leonardo", "Francesco", "Alessandro", "Lorenzo", "Sofia", "Giulia", "Aurora", "Alice", "Ginevra", "Mattia",
  // İspanyolca
  "Mateo", "Santiago", "Matias", "Sebastian", "Sofia", "Camila", "Valentina", "Isabella", "Valeria", "Diego",
  // Rusça (Romanize)
  "Ivan", "Alexander", "Maxim", "Artem", "Sofia", "Maria", "Anna", "Alina", "Dmitry", "Mikhail",
  // Japonca (Romanize)
  "Hiroto", "Ren", "Yuma", "Sota", "Aoi", "Hina", "Sakura", "Yui", "Kenji", "Takumi",
  // Korece (Romanize)
  "Min-jun", "Seo-jun", "Do-yoon", "Ji-woo", "Seo-yeon", "Ha-eun", "Ji-min", "Hyun-woo", "Dong-hyun", "Su-jin",
  // Arapça (Romanize)
  "Omar", "Ali", "Youssef", "Hamza", "Fatima", "Aisha", "Mariam", "Lina", "Zainab", "Amir",
  // Portekizce
  "Miguel", "Arthur", "Gael", "Heitor", "Helena", "Alice", "Laura", "Valentina", "Pedro", "Enzo"
];

const CLAN_TAGS = ["[TR] ", "[PRO] ", "[EZ] ", "[VIP] ", "TSM | ", "Fnatic | ", "T1 ", "Faze ", "[God] ", "[Bot] ", ""];

// Basit bir seed tabanlı rastgele sayı üretici (Seeded RNG)
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

class BotEngine {
  constructor() {
    this.totalBots = 23000;
    
    // Avatar kategorilerini önceden hazırla
    this.premiumAvatars = avatarOptions.filter(a => a.cost >= 10000 || a.premium);
    this.paidAvatars = avatarOptions.filter(a => a.cost > 0);
    this.freeAvatars = avatarOptions.filter(a => a.cost === 0);
  }

  getMonthStart() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    return monthStart.getTime();
  }

  getHoursPassedThisMonth() {
    const now = Date.now();
    const start = this.getMonthStart();
    const diffHours = (now - start) / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  }

  getMonthlySeed() {
    return Math.floor(this.getMonthStart() / 10000);
  }

  generateBotName(botSeed) {
    // İsmi seç
    const nameIndex = Math.floor(seededRandom(botSeed) * NAMES_11_LANGS.length);
    let name = NAMES_11_LANGS[nameIndex];
    
    // %30 ihtimalle sayı ekle
    if (seededRandom(botSeed + 1) > 0.7) {
      const numbers = ["99", "69", "123", "2024", "777", "007", "X", "_Pro", "11"];
      const numIndex = Math.floor(seededRandom(botSeed + 2) * numbers.length);
      name += numbers[numIndex];
    }
    
    // %15 ihtimalle klan tagi ekle
    if (seededRandom(botSeed + 3) > 0.85) {
      const tagIndex = Math.floor(seededRandom(botSeed + 4) * CLAN_TAGS.length);
      name = CLAN_TAGS[tagIndex] + name;
    }
    
    return name;
  }

  generateBotScore(index, botSeed, hoursPassed) {
    // Aylık sezonda taban puan yok, herkes sıfırdan başlar
    const baseScore = 0; 
    
    // Günde oynadıkları tahmini saat (Logaritmik/Üstel bir eğri kullanıyoruz)
    // Bu sayede 1. olan çok daha fazla oynarken, 50. olan ona göre biraz daha az oynar.
    // Herkesin puanı birbirinden organik şekilde ayrılır.
    let simulatedHoursPerDay = 1 + (12 * Math.pow(0.98, index));
    
    const daysPassed = hoursPassed / 24;
    const totalSimulatedHours = daysPassed * simulatedHoursPerDay;
    let progressiveScore = totalSimulatedHours * 500;
    
    // Her bota ay boyunca sabit kalacak bir yetenek/şans çarpanı atıyoruz
    // Bu sayede botların kendi aralarındaki hızı sabit kalır ve liderler hep ilerler
    const jitterMultiplier = 0.8 + (seededRandom(botSeed + 99) * 0.4); 
    progressiveScore *= jitterMultiplier;
    
    return Math.floor(baseScore + progressiveScore);
  }

  getTopBots(count = 50) {
    const monthlySeed = this.getMonthlySeed();
    const hoursPassed = this.getHoursPassedThisMonth();
    
    const topBots = [];
    const poolSize = 1000; // İlk 1000 bot Top 50'yi bulmak için fazlasıyla yeterli
    
    for (let i = 0; i < poolSize; i++) {
      const botSeed = monthlySeed + i;
      const globalTrophies = this.generateBotScore(i, botSeed, hoursPassed);
      
      // Kupa bazlı level simülasyonu (karekök eğrisi) + ufak jitter (-1, 0, 1)
      const jitter = Math.floor(seededRandom(botSeed + 7) * 3) - 1;
      let level = Math.floor(Math.sqrt(globalTrophies) * 0.15) + 1 + jitter;
      if (level < 1) level = 1;

      topBots.push({
        uid: `bot_${i}`,
        profileName: this.generateBotName(botSeed),
        globalTrophies: globalTrophies,
        botSeed: botSeed, // Avatarı atamak için saklıyoruz
        level: level,
        isBot: true
      });
    }
    
    // Puan sırasına göre diz
    topBots.sort((a, b) => b.globalTrophies - a.globalTrophies);
    
    // Şimdi sıralamaya (Rank) göre zeki avatar ataması yapalım
    const selectedBots = topBots.slice(0, count);
    
    selectedBots.forEach((bot, index) => {
      const rank = index + 1;
      let avatarList = this.freeAvatars;
      
      if (rank <= 10) {
        // Top 10: %80 ihtimalle en pahalı / premium avatarlar
        avatarList = (seededRandom(bot.botSeed + 5) < 0.8) ? this.premiumAvatars : avatarOptions;
      } else if (rank <= 50) {
        // Top 50: %80 ihtimalle rastgele ücretli elmas avatarlar
        avatarList = (seededRandom(bot.botSeed + 5) < 0.8) ? this.paidAvatars : avatarOptions;
      }
      
      // Havuzdan güvenli avatar seçimi
      if (!avatarList || avatarList.length === 0) avatarList = this.freeAvatars;
      const avatarIndex = Math.floor(seededRandom(bot.botSeed + 6) * avatarList.length);
      bot.avatarSeed = avatarList[avatarIndex].id;
    });
    
    return selectedBots;
  }
}

export const BotManager = new BotEngine();
