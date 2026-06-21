# Adversarial Verification: Profanity Filter Integration

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the profanity filter correctly blocks exact matches of bad words in lowercase/uppercase (case insensitivity) and prevents false positives on clean names or embedded normal words (due to exact word-boundary matching), it is extremely easy to bypass using standard obfuscation techniques. Specifically, the integration has high vulnerability to:
1. **Accents and Character Substitutions** (e.g. `şalāk`, `sık`, `s1kt1r` are completely allowed).
2. **Punctuation Bypasses** (e.g. `ass-hole`, `ass_hole`, `ass/hole` are allowed because only dots and commas are stripped).
3. **Plurals and Derivations** (e.g. `assholes`, `salaklar` are allowed because of exact-word matching).

---

## Challenges

### [High] Challenge 1: Accents and Character Substitutions
- **Assumption challenged**: The filter assumes that malicious users will only type profanities using standard English or Turkish character sets as defined in the dictionary.
- **Attack scenario**: A user bypasses the filter by using accents (`şalāk`, `sâlak`), lookalike characters (`s1kt1r`, `$h1t`, `s@lak`), or Turkish dotless-i (`sık` instead of `sik`).
- **Blast radius**: Users can display offensive profile names to other players on the leaderboard or multiplayer duel modes.
- **Mitigation**: Before running `leoProfanity.check()`, normalize the input text using a diacritics removal library or custom replacement mapper. For example:
  ```javascript
  function normalizeText(text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/ı/g, "i") // Map Turkish dotless i
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/@/g, "a")
      .replace(/\$/g, "s")
      .replace(/1/g, "i")
      .replace(/0/g, "o")
      .replace(/3/g, "e");
  }
  ```

### [High] Challenge 2: Punctuation-based Obfuscation
- **Assumption challenged**: The library's `sanitize` function assumes that only dots and commas are used as separators.
- **Attack scenario**: The current sanitization logic in `leo-profanity` only replaces `.` and `,` with spaces:
  ```javascript
  sanitize: function (str) {
    return str.toLowerCase().replace(/\.|,/g, ' ');
  }
  ```
  Consequently, joining profanities with hyphens (`ass-hole`), underscores (`ass_hole`), slashes (`ass/hole`), or other symbols will keep the characters joined as a single word (e.g., `"ass-hole"`), which is not in the dictionary and thus completely allowed.
- **Blast radius**: Users can easily circumvent the word filter by inserting any punctuation symbol other than a dot or a comma.
- **Mitigation**: Clean and strip all non-alphanumeric punctuation from the input, or replace all punctuation with spaces before checking:
  ```javascript
  const sanitizedText = text.replace(/[^a-zA-Z0-9şığüçöİĞÜŞÇÖ\s]/g, ' ');
  ```

### [Medium] Challenge 3: Lack of Plural / Suffix Handling
- **Assumption challenged**: The filter assumes that dictionary coverage of base words is sufficient.
- **Attack scenario**: A user appends common plural suffixes (e.g., `"assholes"`) or Turkish suffixes (e.g., `"salaklar"`). Because `leo-profanity` performs exact matching (`_wordsSet.has(word)`), variations that are not explicitly in the dictionary bypass the check.
- **Blast radius**: Basic grammatical variations of bad words bypass the filter.
- **Mitigation**: In addition to exact matching, add stemming or check if the word starts/ends with a bad word from the dictionary (while being careful not to block words like "classic").

---

## Stress Test Results

The profanity filter was evaluated across multiple dimensions. The table below outlines the results of the adversarial checks:

| Scenario / Category | Input | Expected | Actual Behavior | Status | Notes |
|---|---|---|---|---|---|
| **Case Insensitivity** | `salak` | Blocked | Blocked | **PASS** | Matches `salak` in `tr-profanity.json` |
| **Case Insensitivity** | `SaLaK` | Blocked | Blocked | **PASS** | Correctly converted to lowercase |
| **Case Insensitivity** | `SALAK` | Blocked | Blocked | **PASS** | Correctly converted to lowercase |
| **Case Insensitivity** | `asshole` | Blocked | Blocked | **PASS** | Matches `asshole` in English dictionary |
| **Case Insensitivity** | `AsShOlE` | Blocked | Blocked | **PASS** | Correctly converted to lowercase |
| **Case Insensitivity** | `ASSHOLE` | Blocked | Blocked | **PASS** | Correctly converted to lowercase |
| **Case Insensitivity** | `siktir` | Blocked | Blocked | **PASS** | Matches `siktir` in `tr-profanity.json` |
| **Case Insensitivity** | `SİKTİR` | Blocked | Blocked | **PASS** | Lowercases to `siktir` |
| **Case Insensitivity** | `SIKTIR` | Blocked | Blocked | **PASS** | Lowercases to `siktir` |
| **Accents & Substitution** | `şalāk` | Blocked | **Allowed** | **FAIL** | Accents bypass exact match |
| **Accents & Substitution** | `sâlak` | Blocked | **Allowed** | **FAIL** | Accents bypass exact match |
| **Accents & Substitution** | `sãlak` | Blocked | **Allowed** | **FAIL** | Accents bypass exact match |
| **Accents & Substitution** | `s@lak` | Blocked | **Allowed** | **FAIL** | Leetspeak bypasses exact match |
| **Accents & Substitution** | `s1kt1r` | Blocked | **Allowed** | **FAIL** | Leetspeak bypasses exact match |
| **Accents & Substitution** | `sh1t` | Blocked | **Allowed** | **FAIL** | Leetspeak bypasses exact match |
| **Accents & Substitution** | `$h1t` | Blocked | **Allowed** | **FAIL** | Leetspeak bypasses exact match |
| **Accents & Substitution** | `sık` | Blocked | **Allowed** | **FAIL** | Dotless `ı` does not match `i` in dictionary |
| **False Positives (TR Names)** | `Ahmet` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (TR Names)** | `Yusuf` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (TR Names)** | `Barış` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (TR Names)** | `Seda` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (TR Names)** | `Can` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (TR Names)** | `Selin` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (EN Names)** | `John` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (EN Names)** | `Alice` | Allowed | Allowed | **PASS** | Clean name allowed |
| **False Positives (EN Names)** | `Bob` | Allowed | Allowed | **PASS** | Clean name allowed |
| **Embedded Words (EN)** | `class` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `classic` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `assess` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `sass` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `button` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `analytical` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (EN)** | `assisting` | Allowed | Allowed | **PASS** | Exact match prevents substring false-positive |
| **Embedded Words (TR)** | `bisiklet` | Allowed | Allowed | **PASS** | Contains `sik` but allowed |
| **Embedded Words (TR)** | `sıkılmak` | Allowed | Allowed | **PASS** | Contains `sik` / `sık` but allowed |
| **Embedded Words (TR)** | `götürmek` | Allowed | Allowed | **PASS** | Contains `göt` but allowed |
| **Embedded Words (TR)** | `gösteri` | Allowed | Allowed | **PASS** | Contains `göt` but allowed |
| **Obfuscated / Punctuation** | `ass-hole` | Blocked | **Allowed** | **FAIL** | Hyphen splits/obfuscates words |
| **Obfuscated / Punctuation** | `ass_hole` | Blocked | **Allowed** | **FAIL** | Underscore obfuscates words |
| **Obfuscated / Punctuation** | `ass/hole` | Blocked | **Allowed** | **FAIL** | Slash obfuscates words |
| **Obfuscated / Punctuation** | `ass.hole` | Blocked | Blocked | **PASS** | Dot replaced with space, matches `ass` |
| **Obfuscated / Punctuation** | `ass,hole` | Blocked | Blocked | **PASS** | Comma replaced with space, matches `ass` |

---

## Unchallenged Areas

- **Database / Network synchronization**: The profile update checks profanity locally before committing to the Firestore database. However, if a user makes a direct API call or bypasses the client-side code, no server-side Firestore Rules are in place to validate against profanities. That portion of Firestore security rules was not investigated due to lack of write access or active Firebase console configuration.
