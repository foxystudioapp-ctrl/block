import { generateEndlessLevel } from './arrowGenerator.js';
import { SHAPE_EN } from './shapeNames.js';
import { getCurrentLang } from '../utils/i18n.js';

export const DIRS = [
  [-1, 0], // 0: K
  [-1, 1], // 1: KD
  [0, 1],  // 2: D
  [1, 1],  // 3: GD
  [1, 0],  // 4: G
  [1, -1], // 5: GB
  [0, -1], // 6: B
  [-1, -1] // 7: KB
];

const SHAPE_COLORS = {
  'cyan': '#06b6d4',
  'blue': '#3b82f6',
  'orange': '#f97316',
  'yellow': '#eab308',
  'green': '#22c55e',
  'purple': '#a855f7',
  'red': '#ef4444',
  'pink': '#ec4899',
  'default': '#6366f1'
};

export function getShapeColor(shapeName) {
  // 'default' (son eleman) yedek renktir; dağıtımdan çıkarılır. Eskiden `% (length-1)`
  // kullanılıyordu → son renk asla seçilmiyor, üstelik default da hiç gelmiyordu (off-by-one).
  const palette = Object.values(SHAPE_COLORS).slice(0, -1);
  let hash = 0;
  for (let i = 0; i < shapeName.length; i++) {
    hash = shapeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function getShapeName(shapeName, lang) {
  const code = lang || getCurrentLang();
  if (!shapeName) return code === 'tr' ? 'Gizemli' : 'Mystery';
  if (code === 'tr') return shapeName;
  return SHAPE_EN[shapeName] || shapeName;
}

export function getArrowLevelData(levelNum, dense = false) {
  return generateEndlessLevel(levelNum, dense);
}

export function getTotalArrowLevels() {
  return 999999;
}
