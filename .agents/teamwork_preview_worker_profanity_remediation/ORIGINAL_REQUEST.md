## 2026-06-13T22:14:33Z
You are the Worker. Your task is to remediate the vulnerabilities and code quality issues identified in our profanity filter integration in the repository located at c:\Users\askar\OneDrive\Masaüstü\block\.

Follow these remediation steps exactly:

1. **Robust Profanity Filter with Normalization (`src/utils/profanityFilter.js`)**:
   - Modify the filter wrapper to perform comprehensive normalization on the input text before running the check.
   - Implement a helper `normalizeText(text)`:
     - Map Turkish uppercase `İ` -> `i` and `I` -> `ı` before general lowercasing.
     - Convert the string to lowercase.
     - Strip accent marks and diacritics using `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`.
     - Replace common lookalike/leetspeak characters with base letters:
       - `@` and `4` -> `a`
       - `$` and `5` -> `s`
       - `1` and `!` -> `i`
       - `0` -> `o`
       - `3` -> `e`
       - `7` -> `t`
       - `8` -> `b`
     - Map Turkish-specific characters to English equivalents for dictionary matching (e.g. `ı` -> `i`, `ş` -> `s`, `ç` -> `c`, `ğ` -> `g`, `ö` -> `o`, `ü` -> `u`).
     - Remove all non-alphanumeric characters (like hyphens, underscores, slashes, and punctuation) or replace them with spaces to create a space-separated token string.
   - The `check(text)` method must normalize the text, split it by spaces, and check the tokens.
   - Crucially, also run a check with all spaces removed (concatenated) to catch spaced-out obfuscations (e.g. `s i k t i r` or `s.i.k.t.i.r`).
   - If either the space-separated or space-removed text contains profanity, return `true` (blocked).

2. **Performance Overhead & Title Field Check (`src/state/playerState.js`)**:
   - Change `PlayerState.updateProfile(name, title)` to be an `async` function.
   - Dynamically load the profanity filter helper inside the function using `const { default: profanityFilter } = await import('../utils/profanityFilter.js');`. This resolves the startup bundle size overhead.
   - Run the profanity check on BOTH the `name` and the `title` parameters. If either contains profanity, return `{ success: false, error: 'profanity' }`.

3. **UI Integration (`src/screens/profile.js`)**:
   - Update the Save button `onClick` callback to be `async (close) => { ... }`.
   - Call `await PlayerState.updateProfile(...)` and await the result. If validation fails, show the error toast, play tap sound, and return early.

4. **Missing Translations & Malformed Turkish Metadata (`src/utils/i18n.js`)**:
   - Translate the key `"profanity_not_allowed"` to all 11 supported languages:
     - `"tr"`: `"Uygunsuz kelimeler içeren isimler kullanılamaz!"`
     - `"en"`: `"Profile name cannot contain inappropriate words!"`
     - `"es"`: `"¡El nombre de perfil no puede contener palabras inapropiadas!"`
     - `"fr"`: `"Le nom de profil ne peut pas contenir de mots inappropriés !"`
     - `"de"`: `"Profilname darf keine unangemessenen Wörter enthalten!"`
     - `"it"`: `"Il nome del profilo non può contenere parole inappropriate!"`
     - `"pt"`: `"O nome do perfil não pode conter palavras inapropriadas!"`
     - `"ru"`: `"Имя профиля не может содержать неприемлемые слова!"`
     - `"ar"`: `"لا يمكن أن يحتوي اسم الملف الشخصي على كلمات غير لائقة!"`
     - `"zh"`: `"个人资料名称不能包含不当词汇！"`
     - `"ur"`: `"پروفائل نام میں نامناسب الفاظ نہیں ہوسکتے ہیں!"`
   - Clean up the `"tr"` object inside `availableLanguages` list (around line 5100). Remove the extraneous Urdu translation keys so it only contains `"code": "tr"` and `"name": "Türkçe"`.

5. **Test Integration (`verify_profanity.cjs`)**:
   - Rewrite `verify_profanity.cjs` in the project root to import and test the actual `src/utils/profanityFilter.js` module dynamically.
   - Since `verify_profanity.cjs` is a CommonJS script and `profanityFilter.js` is an ES module, use dynamic `import()` inside an async block:
     ```javascript
     const filterPromise = import('./src/utils/profanityFilter.js');
     // ...
     const filter = (await filterPromise).default;
     ```
   - Perform checks on both the standard words and the adversarial/obfuscated ones (e.g. casing, symbols, accents like `şalāk`, `SaLaK`, `s1kt1r`, `s i k t i r`). Ensure it catches them, and allows normal names.

6. **Verify and Build**:
   - Run `node verify_profanity.cjs` to confirm the tests pass.
   - Run `npm run build` to confirm Vite compiles the application without bundling or syntax errors.
   - Document the verification output in your handoff report.
