const fs = require('fs');
const path = require('path');

const translations = {
  tr: "İnternete bağlı değilsiniz, lütfen internetinizi açın.",
  en: "You are not connected to the internet, please check your connection.",
  es: "No estás conectado a internet, por favor verifica tu conexión.",
  fr: "Vous n'êtes pas connecté à Internet, veuillez vérifier votre connexion.",
  de: "Sie sind nicht mit dem Internet verbunden, bitte überprüfen Sie Ihre Verbindung.",
  it: "Non sei connesso a Internet, per favore controlla la tua connessione.",
  pt: "Você não está conectado à internet, por favor verifique sua conexão.",
  ru: "Вы не подключены к Интернету, пожалуйста, проверьте ваше соединение.",
  ja: "インターネットに接続されていません。接続を確認してください。",
  hi: "आप इंटरनेट से जुड़े नहीं हैं, कृपया अपना कनेक्शन जांचें।",
  ar: "أنت غير متصل بالإنترنت، يرجى التحقق من اتصالك."
};

const localesDir = path.join(__dirname, 'src', 'utils', 'locales');

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const lang = file.replace('.js', '');
    const p = path.join(localesDir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    if (!content.includes('no_internet_warning:')) {
      const translation = translations[lang] || translations['en'];
      
      // We will inject it before the closing brace '};'
      content = content.replace(/};\s*$/, `  no_internet_warning: '${translation.replace(/'/g, "\\'")}',\n};\n`);
      fs.writeFileSync(p, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`Skipped ${file} (already has no_internet_warning)`);
    }
  }
});
