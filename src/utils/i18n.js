import { Device } from '@capacitor/device';

export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'ja', name: '日本語' },
  { code: 'hi', name: 'हिन्दी' }
];

const loadedTranslations = {};

export const translations = new Proxy({}, {
  get(target, prop) {
    return loadedTranslations[prop];
  },
  set(target, prop, value) {
    loadedTranslations[prop] = value;
    return true;
  }
});

let currentLang = 'en';

const RTL_LANGS = ['ar'];

const isValidLang = (lang) => availableLanguages.some(l => l.code === lang);

export function applyTextDirection(langCode) {
  const dir = RTL_LANGS.includes(langCode) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('dir', dir);
}

export async function initI18n() {
  // English fallback must be loaded dynamically
  try {
    const lang = 'en';
    const module = await import(`./locales/${lang}.js`);
    loadedTranslations['en'] = module.default;
  } catch (e) {
    console.error('Failed to load English fallback:', e);
  }

  const savedLang = localStorage.getItem('lumina_puzzle_lang');
  if (savedLang && isValidLang(savedLang)) {
    currentLang = savedLang;
  } else {
    try {
      const info = await Device.getLanguageCode();
      const deviceLang = info.value.slice(0, 2).toLowerCase();
      if (isValidLang(deviceLang)) {
        currentLang = deviceLang;
      } else {
        const browserLang = navigator.language.slice(0, 2).toLowerCase();
        if (isValidLang(browserLang)) currentLang = browserLang;
      }
    } catch (e) {
      const browserLang = navigator.language.slice(0, 2).toLowerCase();
      if (isValidLang(browserLang)) currentLang = browserLang;
    }
  }

  if (currentLang !== 'en') {
    try {
      const lang = currentLang;
      const module = await import(`./locales/${lang}.js`);
      loadedTranslations[currentLang] = module.default;
    } catch (e) {
      console.error(`Failed to load translation for ${currentLang}:`, e);
    }
  }

  document.documentElement.lang = currentLang;
  applyTextDirection(currentLang);
}

export function t(key, params = {}) {
  let text = key;
  if (loadedTranslations[currentLang] && loadedTranslations[currentLang][key] !== undefined) {
    text = loadedTranslations[currentLang][key];
  } else if (loadedTranslations['en'] && loadedTranslations['en'][key] !== undefined) {
    text = loadedTranslations['en'][key];
  }
  if (text !== key && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp('{' + k + '}', 'g'), v);
    }
  }
  return text;
}

export async function setLang(langCode) {
  if (isValidLang(langCode)) {
    currentLang = langCode;
    localStorage.setItem('lumina_puzzle_lang', langCode);

    try {
      const lang = langCode;
      const module = await import(`./locales/${lang}.js`);
      loadedTranslations[langCode] = module.default;
    } catch (e) {
      console.error(`Failed to load translation for ${langCode}:`, e);
    }

    document.documentElement.lang = langCode;
    applyTextDirection(langCode);
    window.location.reload();
  }
}

export function getCurrentLang() {
  return currentLang;
}
