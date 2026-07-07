export function formatBlockValue(val) {
  // Geçersiz/sonlu olmayan değerde "NaNundefined" üretmesin.
  if (!Number.isFinite(val)) return '0';
  if (val < 1000) return val.toString();
  
  const suffixes = ["", "K", "M", "B", "T", "aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj", "kk", "ll", "mm", "nn", "oo", "pp", "qq", "rr", "ss", "tt", "uu", "vv", "ww", "xx", "yy", "zz"];
  
  // Use log10 to find the magnitude (power of 10)
  const power = Math.floor(Math.log10(val));
  const suffixNum = Math.floor(power / 3);
  
  if (suffixNum >= suffixes.length) {
    return 'MAX';
  }
  
  let shortValue = val / Math.pow(10, suffixNum * 3);
  return Math.floor(shortValue) + suffixes[suffixNum];
}
