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
    gems: [{ color: 1, type: 'ruby', target: 20 }],
    targetScore: 4000,
    boardSize: 8,
    title: 'Yakut Madeni',
  },
  {
    level: 7,
    moves: 45,
    colors: [1, 2, 3, 4, 5],
    gems: [{ color: 1, type: 'ruby', target: 30 }],
    targetScore: 5000,
    boardSize: 8,
    title: 'Yakut Avı',
  },
  {
    level: 8,
    moves: 42,
    colors: [1, 2, 3, 4, 5],
    gems: [{ color: 2, type: 'sapphire', target: 25 }],
    targetScore: 4500,
    boardSize: 8,
    title: 'Safir Mağarası',
  },
  {
    level: 9,
    moves: 48,
    colors: [1, 2, 3, 4, 5],
    gems: [
      { color: 1, type: 'ruby', target: 20 },
      { color: 2, type: 'sapphire', target: 20 },
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
      { color: 1, type: 'ruby', target: 25 },
      { color: 2, type: 'sapphire', target: 25 },
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
    gems: [{ color: 3, type: 'emerald', target: 25 }],
    targetScore: 5500,
    boardSize: 8,
    title: 'Zümrüt Ormanı',
  },
  {
    level: 12,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 3, type: 'emerald', target: 35 }],
    targetScore: 7000,
    boardSize: 8,
    title: 'Yeşil Derinlik',
  },
  {
    level: 13,
    moves: 45,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 1, type: 'ruby', target: 20 },
      { color: 3, type: 'emerald', target: 20 },
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
      { color: 2, type: 'sapphire', target: 25 },
      { color: 3, type: 'emerald', target: 25 },
    ],
    targetScore: 8500,
    boardSize: 8,
    title: 'Mavi-Yeşil',
  },
  {
    level: 15,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 4, type: 'gold', target: 35 }],
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
      { color: 1, type: 'ruby', target: 25 },
      { color: 4, type: 'gold', target: 20 },
    ],
    targetScore: 10000,
    boardSize: 8,
    title: 'Yakut & Altın',
  },
  {
    level: 17,
    moves: 45,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [{ color: 5, type: 'diamond', target: 25 }],
    targetScore: 10000,
    boardSize: 8,
    title: 'Elmas Madeni',
  },
  {
    level: 18,
    moves: 48,
    colors: [1, 2, 3, 4, 5, 6],
    gems: [
      { color: 5, type: 'diamond', target: 20 },
      { color: 4, type: 'gold', target: 20 },
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
      { color: 1, type: 'ruby', target: 15 },
      { color: 2, type: 'sapphire', target: 15 },
      { color: 3, type: 'emerald', target: 15 },
      { color: 4, type: 'gold', target: 15 },
      { color: 5, type: 'diamond', target: 15 },
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
      { color: 5, type: 'diamond', target: 30 },
      { color: 1, type: 'ruby', target: 20 },
      { color: 2, type: 'sapphire', target: 20 },
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
  const effectiveLevel = Math.min(100, levelNumber);

  // 1. Difficulty scaling (Colors)
  let numColors = 4;
  if (effectiveLevel > 15) numColors = 5;
  if (effectiveLevel > 40) numColors = 6;
  
  const colors = [];
  for (let i = 1; i <= numColors; i++) colors.push(i);

  // 2. Target Score
  const targetScore = 2000 + (effectiveLevel * 800);

  // 3. Moves
  // Max 55 moves. Base is 30, increases slightly.
  const moves = Math.min(55, 30 + Math.floor(effectiveLevel / 2));

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
    const numGems = effectiveLevel > 50 ? 3 : (effectiveLevel > 20 ? 2 : 1);
    for (let i = 0; i < numGems; i++) {
       const gemTarget = 15 + Math.floor(effectiveLevel / 5);
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
