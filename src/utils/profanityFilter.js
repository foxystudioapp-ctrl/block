import leoProfanity from 'leo-profanity';
import englishDictionary from 'leo-profanity/dictionary/default.json';
import turkishDictionary from './tr-profanity.json';

// Clear list and add English + Turkish dictionaries
leoProfanity.clearList();
leoProfanity.add(englishDictionary);
leoProfanity.add(turkishDictionary);

export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  
  // 1. Map Turkish uppercase İ -> i and I -> ı before general lowercasing.
  let normalized = text.replace(/İ/g, 'i').replace(/I/g, 'ı');
  
  // 2. Convert to lowercase
  normalized = normalized.toLowerCase();
  
  // 3. Strip accent marks and diacritics
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // 4. Replace common lookalike/leetspeak characters with base letters
  const leetspeakMap = {
    '@': 'a', '4': 'a',
    '$': 's', '5': 's',
    '1': 'i', '!': 'i',
    '0': 'o',
    '3': 'e',
    '7': 't',
    '8': 'b'
  };
  let leetResult = '';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    leetResult += leetspeakMap[char] || char;
  }
  normalized = leetResult;
  
  // 5. Map Turkish-specific characters to English equivalents
  const trToEnMap = {
    'ı': 'i',
    'ş': 's',
    'ç': 'c',
    'ğ': 'g',
    'ö': 'o',
    'ü': 'u'
  };
  let trResult = '';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    trResult += trToEnMap[char] || char;
  }
  normalized = trResult;
  
  // 6. Remove all non-alphanumeric characters or replace them with spaces
  normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, ' ');
  
  return normalized;
}

export function check(text) {
  if (typeof text !== 'string') return false;
  
  const normalized = normalizeText(text);
  
  // Split by spaces to check tokens
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  // Check space-separated tokens
  const hasSpaceSeparatedProfanity = tokens.some(token => leoProfanity.check(token));
  
  // Run a check with all spaces removed (concatenated)
  const spaceRemovedText = tokens.join('');
  const hasSpaceRemovedProfanity = leoProfanity.check(spaceRemovedText);
  
  return hasSpaceSeparatedProfanity || hasSpaceRemovedProfanity;
}

export function clean(text) {
  return leoProfanity.clean(text);
}

export default {
  normalizeText,
  check,
  clean
};
