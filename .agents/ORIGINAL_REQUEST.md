# Original User Request

## Initial Request — 2026-06-13T02:56:46Z

<USER_REQUEST>
# Teamwork Project Prompt — Final

> Status: Ready for launch — awaiting user approval
> Goal: Delegate to teamwork_preview

Projenin web build'ini alıp Capacitor ile senkronize ettikten sonra, Google Play Store için standart (imzasız) Android App Bundle (.aab) formatında bir release paketi oluşturmak.

Working directory: c:\Users\askar\OneDrive\Masaüstü\block
Integrity mode: development

## Requirements

### R1. Web Dosyalarının Senkronizasyonu
`npm run build` ile projenin web tarafı derlenmeli ve `npx cap sync android` ile Android klasörüne aktarılmalı.

### R2. AAB Oluşturulması
Android klasörü içerisinde Gradle kullanılarak (`./gradlew bundleRelease`) uygulamanın release AAB paketi oluşturulmalı (eskiden yapıldığı gibi standart varsayılan ayarlarla).

## Acceptance Criteria

### Başarılı Derleme
- [ ] `android/app/build/outputs/bundle/release/` dizininde `app-release.aab` veya `app-release-unsigned.aab` dosyasının oluşması.
- [ ] İşlemin terminalde hata vermeden başarıyla tamamlanması.
</USER_REQUEST>

## Follow-up — 2026-06-13T18:57:24Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Oyuncu isimleri oluşturulurken tüm dillerde küfürlü ve uygunsuz kelimelerin kullanılmasını engelleyen bir filtre sistemi (profanity filter) entegre edilecek.

Working directory: c:/Users/askar/OneDrive/Masaüstü/block
Integrity mode: development

## Requirements

### R1. Profanity Filter Integration
Oyuncuların profil isimlerini belirlediği veya değiştirdiği yerlerde (ilgili UI/oyun mantığı dosyalarında) küfür filtresi devreye girmelidir. Uygunsuz isimler engellenmeli veya maskelenmelidir.

### R2. Use NPM Library
Core filtreleme mantığı için `leo-profanity`, `bad-words` veya benzeri, çoklu dil desteğine sahip açık kaynaklı bir npm kütüphanesi kullanılmalıdır.

## Acceptance Criteria

### Profanity Blocking
- [ ] Sistem, bariz küfürlü veya uygunsuz kelimeleri içeren isimleri (örneğin İngilizce ve Türkçe) başarıyla engeller veya maskeler.
- [ ] Temiz ve normal isimler hiçbir engele takılmadan kullanılabilir.

### Programmatic Verification
- [ ] Proje kök dizininde `verify_profanity.cjs` adında basit bir test scripti oluşturulmuştur.
- [ ] Bu script, kütüphanenin doğru çalıştığını (en az 3 kötü kelimenin yakalandığını, 3 normal ismin geçtiğini) gösterir.
</USER_REQUEST>

## Follow-up — 2026-06-16T03:55:04Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Oyun içerisinde (özellikle Match, Merge, Classic ve Hex modlarında) yapılan mekanik değişiklikleri ve bellek temizliği (cleanup) güncellemelerinden sonra, ajan takımı oyundaki tüm oyun modlarını bizzat tarayıcı üzerinden oynayarak test etmeli, konsol hatalarını ve animasyon çökmelerini tespit etmelidir.

Working directory: c:\Users\askar\OneDrive\Masaüstü\block
Integrity mode: benchmark

## Requirements

### R1. Test Ortamı Hazırlığı
Ajan takımı, projeyi tarayıcıda çalıştırabilmek için yerel geliştirme sunucusunu (`npm run dev` vb.) başlatmalı ve tarayıcı etkileşim araçlarını hazırlamalıdır.

### R2. Tüm Modların Manuel Testi
Ajan takımı, ana menüdeki **TÜM** oyun modlarına (Classic, Match, Merge, Hex, Sort vb.) teker teker girmeli, her birinde en az birkaç temel hamle/sürükleme yapmalıdır. 

### R3. Bellek Sızıntısı ve Çökme Kontrolü (Memory Leak / Crash Check)
Her bir modda oynarken ve özellikle blokları sürüklerken/hamle yaparken aniden "Geri" butonuna basıp ana menüye dönülmeli ve tarayıcı konsoluna herhangi bir `null-reference` hatası, bellek sızıntısı uyarısı veya animasyon çökmesi (exception) düşüp düşmediği izlenmelidir.

## Acceptance Criteria

### Test ve Doğrulama (Agent-as-Judge)
- [ ] Geliştirme sunucusu başarıyla ayağa kalkmış ve oyun taranabilir/oynanabilir duruma gelmiştir.
- [ ] Bütün oyun modları teker teker açılıp içlerinde oynanış sergilenmiştir.
- [ ] Sürükleme veya aktif oyun esnasında aniden menüye dönülerek `cleanup` mantıklarının ve `AbortController` eklemelerinin (özellikle Merge, Hex, Match modlarında) çökmeye sebep olmadığı doğrulanmıştır.
- [ ] Tarayıcı konsol logları toplanarak hata çıkıp çıkmadığına dair nihai bir sonuç raporu hazırlanmıştır.
</USER_REQUEST>

## Follow-up — 2026-06-20T14:02:42Z

<USER_REQUEST>
Fix all 87+ bugs and issues identified in the recent `scan_report.md` across all 10 block puzzle game modes. This includes crash fixes, logic bugs, performance leaks, and UI/UX translation issues.

Working directory: c:\Users\askar\OneDrive\Masaüstü\block
Integrity mode: development

## Requirements

### R1. Comprehensive Bug Fixing
Resolve every issue documented in `scan_report.md`. Ensure that resolving one issue does not introduce new regressions in the game logic. The issues span across `mergeBlock.js`, `colorSort.js`, `game2048.js`, `hexBlock.js`, `x2Block.js`, `matchMode.js`, `arrowPuzzle.js`, `bubbleShooter.js`, and `duelMode.js`.

### R2. Adherence to Existing Architecture
When fixing performance issues (e.g., memory leaks, orphaned RAFs) or missing functions, follow the project's existing patterns (e.g., using `timeoutIds`, `intervalIds`, and `activeBodyAppends` arrays for cleanup). Do not rewrite the core game engines; strictly patch the identified logic and UI bugs.

## Acceptance Criteria

### Verification via Agent-as-Judge
- [ ] An independent auditor agent reviews the codebase after the fixes are applied.
- [ ] The auditor verifies that all CRITICAL and HIGH severity issues listed in `scan_report.md` have been fixed.
- [ ] The auditor verifies that all missing variables (e.g., `activeBodyAppends`) are properly declared in their respective files.
- [ ] The auditor confirms that all cleanup functions have been updated to clear `intervalIds`, `timeoutIds`, `activeBodyAppends`, and cancel RAFs.
</USER_REQUEST>

