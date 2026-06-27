/**
 * Level definitions for Mücevher Blok (Jewel Block) Match-3 Mode
 * Each level has: moves, colors, gem targets, target score, board size
 */
export const MATCH_LEVELS = [
  // ===== BÖLÜM 1-5: ÇIRAKLIK (Sadece Renkli Bloklar) =====
  {
    level: 1,
    moves: 35,
    colors: [1, 2, 3, 4],
    gems: [],
    targetScore: 2000,
    boardSize: 8,
    title: 'Başlangıç'
  },
  {
    level: 2,
    moves: 38,
    colors: [1, 2, 3, 4],
    gems: [],
    targetScore: 3500,
    boardSize: 8,
    title: 'İlk Adım',
  },
  {
    level: 3,
    moves: 40,
    colors: [1, 2, 3, 4],
    gems: [],
    targetScore: 5000,
    boardSize: 8,
    title: 'Isınma',
  },
  {
    level: 4,
    moves: 40,
    colors: [1, 2, 3, 4, 5],
    gems: [],
    targetScore: 6500,
    boardSize: 8,
    title: 'Yeni Renkler',
  },
  {
    level: 5,
    moves: 42,
    colors: [1, 2, 3, 4, 5],
    gems: [],
    targetScore: 8500,
    boardSize: 8,
    title: 'Kombo Zamanı',
  },

  // ===== BÖLÜM 6-10: KEŞİF (Yakut & Safir) =====
  {
    level: 6,
    moves: 45,
    colors: [1, 2, 3, 4, 5],
    gems: [{ color: 1, type: 'ruby', target: 12 }],
    targetScore: 4000,
    boardSize: 8,
    title: 'Yakut Madeni',
  },
  {
    level: 7,
    moves: 45,
    colors: [1, 2, 3, 4, 5],
    gems: [{ color: 1, type: 'ruby', target: 15 }],
    targetScore: 5000,
    boardSize: 8,
    title: 'Yakut Avı',
  },
  {
    level: 8,
    moves: 42,
    colors: [1, 2, 3, 4, 5],
    gems: [{ color: 2, type: 'sapphire', target: 14 }],
    targetScore: 4500,
    boardSize: 8,
    title: 'Safir Mağarası',
  },
  {
    level: 9,
    moves: 48,
    colors: [1, 2, 3, 4, 5],
    gems: [
      { color: 1, type: 'ruby', target: 12 },
      { color: 2, type: 'sapphire', target: 12 },
    ],
    targetScore: 6000,
    boardSize: 8,
    title: 'İkili Hazine',
  },
  {
    level: 10,
    moves: 45,
    colors: [1, 2, 3, 4, 5],
    gems: [
      { color: 1, type: 'ruby', target: 14 },
      { color: 2, type: 'sapphire', target: 14 },
    ],
    targetScore: 7500,
    boardSize: 8,
    title: 'Maden Kralı',
  },

  // ===== BÖLÜM 11-15: DERİNLİK (Zümrüt & Altın) =====
  {
    level: 11,
    moves: 50,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 3, type: 'emerald', target: 14 }],
    targetScore: 5500,
    boardSize: 8,
    title: 'Zümrüt Ormanı',
  },
  {
    level: 12,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 3, type: 'emerald', target: 16 }],
    targetScore: 7000,
    boardSize: 8,
    title: 'Yeşil Derinlik',
  },
  {
    level: 13,
    moves: 45,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 1, type: 'ruby', target: 12 },
      { color: 3, type: 'emerald', target: 12 },
    ],
    targetScore: 7000,
    boardSize: 8,
    title: 'Çifte Maden',
  },
  {
    level: 14,
    moves: 50,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 2, type: 'sapphire', target: 13 },
      { color: 3, type: 'emerald', target: 13 },
    ],
    targetScore: 8500,
    boardSize: 8,
    title: 'Mavi-Yeşil',
  },
  {
    level: 15,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 4, type: 'gold', target: 16 }],
    targetScore: 9000,
    boardSize: 8,
    title: 'Altın Çağı',
  },

  // ===== BÖLÜM 16-20: USTA (Elmas & Karma) =====
  {
    level: 16,
    moves: 50,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 1, type: 'ruby', target: 12 },
      { color: 4, type: 'gold', target: 12 },
    ],
    targetScore: 10000,
    boardSize: 8,
    title: 'Yakut & Altın',
  },
  {
    level: 17,
    moves: 45,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 5, type: 'diamond', target: 14 }],
    targetScore: 10000,
    boardSize: 8,
    title: 'Elmas Madeni',
  },
  {
    level: 18,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 5, type: 'diamond', target: 12 },
      { color: 4, type: 'gold', target: 12 },
    ],
    targetScore: 12000,
    boardSize: 8,
    title: 'Altın Elmas',
  },
  {
    level: 19,
    moves: 50,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 1, type: 'ruby', target: 9 },
      { color: 2, type: 'sapphire', target: 9 },
      { color: 3, type: 'emerald', target: 9 },
      { color: 4, type: 'gold', target: 9 },
      { color: 5, type: 'diamond', target: 9 },
    ],
    targetScore: 15000,
    boardSize: 8,
    title: 'Beş Hazine',
  },
  {
    level: 20,
    moves: 55,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 5, type: 'diamond', target: 15 },
      { color: 1, type: 'ruby', target: 11 },
      { color: 2, type: 'sapphire', target: 11 },
    ],
    targetScore: 20000,
    boardSize: 8,
    title: 'Efsanevi Hazine',
  },
];

const EASY_LAYOUT_TEMPLATES = [
  // 0: Just 2 cages in the middle
  [
    '........',
    '........',
    '........',
    '...CC...',
    '........',
    '........',
    '........',
    '........'
  ],
  // 1: Four corner bricks
  [
    'B......B',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'B......B'
  ],
  // 2: Two simple columns
  [
    '........',
    '........',
    '..B..B..',
    '..B..B..',
    '........',
    '........',
    '........',
    '........'
  ],
  // 3: 4 Cages spread out
  [
    '........',
    '..C..C..',
    '........',
    '........',
    '........',
    '..C..C..',
    '........',
    '........'
  ]
];

const LAYOUT_TEMPLATES = [
  // 0: Small Cross (Blocks fall around it)
  [
    '........',
    '........',
    '..BBBB..',
    '..C..C..',
    '..C..C..',
    '..BBBB..',
    '........',
    '........'
  ],
  // 1: Center Box
  [
    '........',
    '...BB...',
    '..BCCB..',
    '.BC..CB.',
    '.BC..CB.',
    '..BCCB..',
    '...BB...',
    '........'
  ],
  // 2: Four Corners (leaves center fully open)
  [
    'B.C..C.B',
    '.C....C.',
    '........',
    '........',
    '........',
    '........',
    '.C....C.',
    'B.C..C.B'
  ],
  // 3: Vertical Columns (Gravity flows easily)
  [
    '........',
    '.C.C.C.C',
    '.C.C.C.C',
    '.C.C.C.C',
    '.C.C.C.C',
    '.C.C.C.C',
    '.C.C.C.C',
    '........'
  ],
  // 4: Side Walls
  [
    '........',
    'BB....BB',
    'CC....CC',
    'CC....CC',
    'CC....CC',
    'CC....CC',
    'BB....BB',
    '........'
  ],
  // 5: X Marks the Spot
  [
    'B......B',
    '.C....C.',
    '..C..C..',
    '...BB...',
    '...BB...',
    '..C..C..',
    '.C....C.',
    'B......B'
  ],
  // 6: Diamond
  [
    '...BB...',
    '..C..C..',
    '.C....C.',
    'B......B',
    'B......B',
    '.C....C.',
    '..C..C..',
    '...BB...'
  ],
  // 7: Open Center
  [
    '........',
    '.C.BB.C.',
    '.C....C.',
    '.C....C.',
    '.C....C.',
    '.C....C.',
    '.C.BB.C.',
    '........'
  ]
];

function generateLevelData(levelNumber) {
  // Zorluk artık seviye 100'de DONMUYOR — seviyeyle birlikte (güvenli, achievable sınırlar
  // içinde) artmaya devam eder. Renk paleti motor sınırı 6 ile kelepçeli; asıl zorluk
  // kaldıracı gem hedefi + gem çeşididir (macera >20 zaten gem-toplama oynanışı).
  const effectiveLevel = levelNumber;

  // 1. Difficulty scaling (Colors)
  let numColors = 4;
  if (effectiveLevel > 15) numColors = 5;
  if (effectiveLevel > 40) numColors = 6;
  
  const colors = [];
  for (let i = 1; i <= numColors; i++) colors.push(i);

  // 2. Target Score
  // Gem seviyelerinde (macera >20) kazanma gem'e bağlı olduğundan skor ikincildir; yine de
  // HUD makullüğü için makul bir tavanla büyür.
  const targetScore = Math.min(120000, 2000 + (effectiveLevel * 800));

  // 3. Moves
  // Taban 44'e çekildi: 21. seviye (yeni prosedürel bölüm) elle-yapılmış 20. seviyenin
  // 55 hamlesinin hemen altında başlasın (eski 30+lvl/2 = 40 cliff'i giderildi).
  // Tavan 55: artan zorluk hamleyle değil gem hedefiyle gelir.
  const moves = Math.min(55, 44 + Math.floor(effectiveLevel / 6));

  // 4. Layout
  // Levels 1-4: No layout (open board)
  // Levels 5-29: Easy layouts every 2 levels
  // Levels 30+: Hard layouts every 2 levels or always if >50
  let layout = undefined;
  if (levelNumber >= 5 && levelNumber < 30) {
    if (levelNumber % 2 === 0) {
      const layoutIdx = levelNumber % EASY_LAYOUT_TEMPLATES.length;
      layout = EASY_LAYOUT_TEMPLATES[layoutIdx];
    }
  } else if (levelNumber >= 30) {
    if (levelNumber % 2 === 0 || levelNumber > 50) {
      const layoutIdx = levelNumber % LAYOUT_TEMPLATES.length;
      layout = LAYOUT_TEMPLATES[layoutIdx];
    }
  }

  // 5. Gems
  const gems = [];
  if (levelNumber % 3 === 0 || levelNumber > 20) {
    const gemTypes = [
      { color: 1, type: 'ruby' },
      { color: 2, type: 'sapphire' },
      { color: 3, type: 'emerald' },
      { color: 4, type: 'gold' },
      { color: 5, type: 'diamond' },
      { color: 6, type: 'topaz' }
    ];
    // Gem çeşidi en fazla 3. KALİBRASYON (headless engine simülasyonuyla doğrulandı):
    //   - Tek renk hedefi 16 ile tavanlı. Tek renkli yüksek hedef en zor desendir,
    //     çünkü gemi YALNIZCA o rengi eşleyerek toplayabilirsin.
    //   - Çoklu-gem seviyelerinde toplam yük TOTAL_CAP (36) ile sınırlı; renk başına
    //     hedef buna göre düşürülür. Eski formül (3 x 40 = 120) 55 hamlede imkânsızdı.
    // NOT: Match-3'te zorluk sonsuza dek SAYIYLA artamaz (sınırlı hamlede sınırsız gem
    // yok); üst seviyelerde magnitüd platoya oturur, çeşitlilik (gem rengi + layout
    // rotasyonu) taşır. Gerçek üst-seviye kaldıraç engel yoğunluğu/yeni mekaniktir.
    const numGems = effectiveLevel > 60 ? 3 : (effectiveLevel > 25 ? 2 : 1);
    let gemTarget = Math.min(16, 9 + Math.floor(effectiveLevel / 8));
    const TOTAL_CAP = 36;
    if (numGems * gemTarget > TOTAL_CAP) {
      gemTarget = Math.floor(TOTAL_CAP / numGems);
    }
    for (let i = 0; i < numGems; i++) {
       gems.push({ ...gemTypes[(levelNumber + i) % numColors], target: gemTarget });
    }
  }

  return {
    level: levelNumber,
    moves,
    colors,
    gems,
    targetScore,
    boardSize: 8,
    title: `Bölüm ${levelNumber}`,
    layout
  };
}

export function getLevelData(levelNumber) {
  const generated = generateLevelData(levelNumber);
  const hardcoded = MATCH_LEVELS.find(l => l.level === levelNumber);
  
  if (hardcoded) {
    return {
      ...generated,
      ...hardcoded,
      layout: hardcoded.layout !== undefined ? hardcoded.layout : generated.layout
    };
  }
  
  return generated;
}
