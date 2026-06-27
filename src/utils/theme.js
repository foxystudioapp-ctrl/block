import { t } from './i18n.js';

// Tema verisi + uygulayıcı. shop.js'ten ayrıldı ki açılışta (boot) tüm mağaza UI
// kodu yüklenmesin — sadece bu küçük modül + applyTheme yeterli. shop.js artık lazy.
export const THEMES = [
  {
    id: 'default',
    get name() { return t('shop_default'); },
    price: 0,
    colors: { secondary: '#0058bc', accent: '#00e5ff' },
    icon: 'water_drop'
  },
  {
    id: 'forest',
    get name() { return t('shop_forest'); },
    price: 500,
    colors: { secondary: '#15803d', accent: '#4ade80' },
    icon: 'eco'
  },
  {
    id: 'sunset',
    get name() { return t('shop_sunset'); },
    price: 1000,
    colors: { secondary: '#c2410c', accent: '#fb923c' },
    icon: 'wb_twilight'
  },
  {
    id: 'neon',
    get name() { return t('shop_neon'); },
    price: 2500,
    colors: { secondary: '#be185d', accent: '#f472b6' },
    icon: 'bolt'
  },
  {
    id: 'royal',
    get name() { return t('shop_royal'); },
    price: 5000,
    colors: { secondary: '#7e22ce', accent: '#c084fc' },
    icon: 'diamond'
  }
];

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  document.documentElement.style.setProperty('--color-secondary', theme.colors.secondary);
  document.documentElement.style.setProperty('--color-accent-cyan', theme.colors.accent);
  // secondary-container'ı accent ile eşleştir (mevcut davranış birebir aynı)
  document.documentElement.style.setProperty('--color-secondary-container', theme.colors.accent);
}
