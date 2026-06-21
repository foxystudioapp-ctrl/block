# Adversarial Review Challenge Report — Profanity Filter Integration

## Challenge Summary

**Overall risk assessment**: HIGH

The profanity filter integration in the `block` project relies on the third-party library `leo-profanity` (v1.9.0) combined with a small custom Turkish wordlist (`src/utils/tr-profanity.json`). While the integration successfully avoids false positives and does not block clean names or embedded substrings (due to strict space-delimited word matching), it has critical vulnerabilities that allow trivial bypasses. 

Specifically, the filter is highly vulnerable to:
1. **Punctuation Bypasses**: Any bad word appended with punctuation other than a dot or comma (e.g., `salak!`, `siktir?`) bypasses the filter.
2. **Accents & Character Substitutions**: Common leetspeak (e.g., `@` for `a`, `$` for `s`) and accented variants (e.g., `şalāk`) bypass the filter.
3. **Turkish Unicode Case Defect**: Capitalized Turkish words using dotted `İ` or dotless `I` (e.g., `SİKTİR`, `SıkTır`) bypass the filter due to standard `toLowerCase()` Unicode mapping limitations and dictionary mismatches.
4. **Unfiltered Fields**: Only the `name` field is checked in profile updates; the `title` field is completely unchecked.

---

## Challenges

### [Critical] Challenge 1: Accent & Character Substitution Bypass
- **Assumption challenged**: The filter assumes that standard dictionary matching on exact lowercase tokens is sufficient to block vulgar words.
- **Attack scenario**: A user inputs a variant of a bad word using accents or leetspeak substitutions (e.g., `şalāk`, `s@l@k`, `s1kt1r`, `a$$hole`).
- **Blast radius**: Complete bypass of the filter. Abusive names can be displayed publicly to other players.
- **Mitigation**: 
  1. Normalize accents using string decomposition before filtering:
     ```javascript
     text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
     ```
  2. Implement a pre-processing step that maps common leetspeak characters (e.g., `@` -> `a`, `$` -> `s`, `1` -> `i`, `0` -> `o`) to their standard alphabet counterparts.

### [High] Challenge 2: Punctuation Bypass
- **Assumption challenged**: The filter assumes that users only separate words with spaces, dots, or commas.
- **Attack scenario**: A user appends an exclamation mark, question mark, hyphen, or underscore to a bad word (e.g., `asshole!`, `siktir?`, `salak-göt`).
- **Blast radius**: Trivial bypass. Users can append any non-alphanumeric character (except `.` and `,`) to bypass validation.
- **Mitigation**: 
  Clean input tokens to strip all non-alphanumeric characters prior to matching. For example, replace any punctuation/special characters with space or strip them:
  ```javascript
  const sanitized = str.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ\s]/g, '');
  ```

### [Medium] Challenge 3: Turkish Locale Case Conversion Defect
- **Assumption challenged**: The filter assumes standard `toLowerCase()` correctly converts uppercase Turkish letters like 'İ' and 'I' for dictionary matching.
- **Attack scenario**: A user inputs `'SİKTİR'` or `'SıkTır'`.
  - Under standard JS `toLowerCase()`, `'SİKTİR'` becomes `'si\u0307kti\u0307r'` (with combining dot above). This does not match `"siktir"` in `tr-profanity.json`.
  - `'SıkTır'` becomes `'sıktır'`. Since the dictionary contains `"siktir"` but not `"sıktır"`, the lookup fails.
- **Blast radius**: Turkish profanities in uppercase or mixed-case containing dotless 'ı' or dotted 'İ' will bypass the filter.
- **Mitigation**: 
  1. Use `toLocaleLowerCase('tr-TR')` when normalizing Turkish inputs.
  2. Normalize both 'ı' and 'i' (and their uppercase counterparts) to the same character before lookup, or include both dotted and dotless variations in `tr-profanity.json`.

### [Low] Challenge 4: Profile Title Field is Unfiltered
- **Assumption challenged**: The filter assumes only the player's name needs to be free of profanities.
- **Attack scenario**: A user sets their profile name to a clean name (e.g., `Ahmet`) but updates their profile title to containing profanity (`updateProfile(name, title)` in `src/state/playerState.js` only passes `name` to the filter check).
- **Blast radius**: Vulgar titles can be set and displayed.
- **Mitigation**: Run `profanityFilter.check(title)` in addition to `name` inside `updateProfile`.

---

## Stress Test Results

| Category | Input / Scenario | Expected Behavior | Actual/Predicted Behavior | Pass/Fail | Technical Detail |
|---|---|---|---|---|---|
| **Case Insensitivity** | `'SaLaK'` | Blocked | Blocked | **PASS** | Exact match after `.toLowerCase()` |
| **Case Insensitivity** | `'AsShOlE'` | Blocked | Blocked | **PASS** | Exact match after `.toLowerCase()` |
| **Case Insensitivity** | `'sIkTiR'` | Blocked | Blocked | **PASS** | Exact match after `.toLowerCase()` |
| **Case Insensitivity** | `'sIktIr'` | Blocked | Blocked | **PASS** | `'I'` becomes `'i'` under default locale |
| **Case Insensitivity** | `'SİKTİR'` | Blocked | Allowed | **FAIL** | `'İ'` becomes `'i\u0307'`, causing mismatch |
| **Case Insensitivity** | `'SıkTır'` | Blocked | Allowed | **FAIL** | Dictionaries do not contain `'sıktır'` |
| **Substitutions/Accents** | `'şalāk'` | Blocked | Allowed | **FAIL** | No accent normalization |
| **Substitutions/Accents** | `'sâlak'` | Blocked | Allowed | **FAIL** | No accent normalization |
| **Substitutions/Accents** | `'s@l@k'` | Blocked | Allowed | **FAIL** | No leetspeak normalization |
| **Substitutions/Accents** | `'s*kt*r'` | Blocked | Allowed | **FAIL** | Masked word lookup fails |
| **Substitutions/Accents** | `'s.i.k.t.i.r'` | Blocked | Allowed | **FAIL** | Split into `'s'`, `'i'`, `'k'`, `'t'`, `'i'`, `'r'` |
| **Punctuation** | `'asshole!'` | Blocked | Allowed | **FAIL** | Exclamation mark remains on the token |
| **Turkish Names** | `'Ahmet'` | Allowed | Allowed | **PASS** | Name is clean |
| **Turkish Names** | `'Yusuf'` | Allowed | Allowed | **PASS** | Name is clean |
| **Turkish Names** | `'Barış'` | Allowed | Allowed | **PASS** | Name is clean |
| **Turkish Names** | `'Seda'` | Allowed | Allowed | **PASS** | Name is clean |
| **Turkish Names** | `'Can'` | Allowed | Allowed | **PASS** | Name is clean |
| **Turkish Names** | `'Selin'` | Allowed | Allowed | **PASS** | Name is clean |
| **English Names** | `'John'` | Allowed | Allowed | **PASS** | Name is clean |
| **English Names** | `'Alice'` | Allowed | Allowed | **PASS** | Name is clean |
| **English Names** | `'Bob'` | Allowed | Allowed | **PASS** | Name is clean |
| **Embedded Substrings** | `'tamam'` | Allowed | Allowed | **PASS** | Token is `'tamam'`, no substring match |
| **Embedded Substrings** | `'eksik'` | Allowed | Allowed | **PASS** | Token is `'eksik'`, no substring match |
| **Embedded Substrings** | `'götürmek'` | Allowed | Allowed | **PASS** | Token is `'götürmek'`, no substring match |
| **Embedded Substrings** | `'assume'` | Allowed | Allowed | **PASS** | Token is `'assume'`, no substring match |
| **Embedded Substrings** | `'class'` | Allowed | Allowed | **PASS** | Token is `'class'`, no substring match |

---

## Unchallenged Areas

- **Full English Dictionary Coverage**: The entire default English dictionary loaded by `leo-profanity` was not exhaustively checked entry-by-entry. However, the library is standard, and we validated the correctness of the integration framework itself.
