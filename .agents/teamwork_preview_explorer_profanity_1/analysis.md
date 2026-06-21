# Analysis: Leo-Profanity Integration for Profile Names

## Executive Summary
This report analyzes the integration of the `leo-profanity` package to filter profile name updates in a Vite + Capacitor app. The recommended strategy is to perform validation at the state manager level (`PlayerState.updateProfile`) using a custom ESM wrapper that avoids dynamic `require` errors, while displaying warnings in the UI (`profile.js`) without closing the edit modal.

---

## 1. Current State Analysis

### package.json
* **Path**: `package.json`
* **Observations**:
  * The project runs as an ES module (`"type": "module"`).
  * Dev bundler is `vite` (^8.0.12).
  * `@capacitor/core` (^8.3.4) and other Capacitor plugins are present.
  * `leo-profanity` is currently **not** present in the dependencies and needs to be added (e.g., `"leo-profanity": "^1.7.0"`).

### src/screens/profile.js
* **Path**: `src/screens/profile.js`
* **Observations**:
  * Lines 193-230 handle the name edit modal logic using `createModal` from `../components/modal.js`.
  * The modal save button (lines 204-219) currently extracts `newName = input.value.trim()`, calls `PlayerState.updateProfile(newName, ...)`, sets `player_profile_name` in `Storage`, updates the UI element `#profile-name-display`, plays a success sound, and immediately calls `close()`.
  * Toast component is imported dynamically on-demand in other sections (e.g., line 430).

### src/state/playerState.js
* **Path**: `src/state/playerState.js`
* **Observations**:
  * Employs a `PlayerStateManager` class exported as a singleton `PlayerState`.
  * `updateProfile(name, title)` (lines 292-296) updates the internal state fields and calls `this.save()`, which persists changes to local storage. It does not return any status indicating success or failure.

---

## 2. Configuring Leo-Profanity for English & Turkish

### English Support
* `leo-profanity` loads its default English dictionary statically during initialization (via `require('./dictionary/en.json')`). This works automatically once the module is imported.

### Turkish Support
* `leo-profanity` does **not** have a built-in Turkish dictionary.
* Calling `.loadDictionary('tr')` dynamically will crash in browser environments due to lack of `require` support (see section 5).
* **Proposed Solution**: We should maintain a Turkish word list in a local JSON file (`src/utils/profanity/tr.json`) containing an array of profane strings.
* At startup, we load the English dictionary (loaded automatically) and merge the Turkish dictionary by calling `filter.add(turkishWords)`.

---

## 3. Validation Check Placement & UX Flow

We compared two implementation patterns:

| Aspect | Option A: Block and Alert (Recommended) | Option B: Mask (Alternative) |
|---|---|---|
| **Mechanism** | Reject the edit, show a toast, keep modal open. | Clean the name using asterisks (`***`), save, and close modal. |
| **UX Quality** | **High**: User understands why their name was rejected and can edit it instantly. | **Medium**: User's name is modified to symbols without their consent. |
| **UI Integration** | Needs error Toast and error Sound feedback. | Simple drop-in replacement in the save chain. |

### Recommended UX Flow: Hybrid Validation
1. **State Level**: Update `PlayerState.updateProfile(name, title)` to check the name. If it fails, return `{ success: false, error: 'profanity' }`.
2. **UI Level**: In `profile.js`, call `PlayerState.updateProfile`. If it returns success, close the modal and play `success` SFX. If it returns false:
   * Show an error toast: `Toast.show(t('profanity_not_allowed'), 'error')`
   * Play warning sound: `Sounds.playSfx('invalid')`
   * **Do not** call `close()`, allowing the user to correct the name in the input field.

---

## 4. Proposed File Additions & Modifications

### A. New File: `src/utils/profanity/tr.json`
A shared JSON word list that can be imported by ES modules and required by CommonJS scripts.
```json
[
  "pislik",
  "salak",
  "aptal"
]
```

### B. New File: `src/utils/profanityFilter.js`
An ES Module wrapper that safely exposes `leo-profanity` in Vite.
```javascript
import leoProfanity from 'leo-profanity';
import trWords from './profanity/tr.json';

// Handle CommonJS default export wrapper issues in Vite
const filter = leoProfanity.default || leoProfanity;

// Load Turkish words on top of default English words
filter.add(trWords);

export default filter;
```

### C. Modifications to `src/state/playerState.js`
Update `updateProfile` to return a validation status.
```javascript
  async updateProfile(name, title) {
    const { default: filter } = await import('../utils/profanityFilter.js');
    if (filter.check(name)) {
      return { success: false, error: 'profanity' };
    }
    this.state.profileName = name;
    this.state.profileTitle = title;
    this.save();
    return { success: true };
  }
```

### D. Modifications to `src/screens/profile.js`
Integrate the callback inside the modal actions:
```javascript
            { 
              text: t('save'), 
              primary: true, 
              onClick: async (close) => {
                const input = document.getElementById('name-edit-input');
                if (input && input.value.trim().length > 0) {
                  const newName = input.value.trim();
                  
                  const result = await PlayerState.updateProfile(newName, PlayerState.state.profileTitle);
                  
                  if (!result.success) {
                    const { Toast } = await import('../components/toast.js');
                    Toast.show(t('profanity_not_allowed') || 'Uygunsuz isimler kullanılamaz!', 'error');
                    Sounds.playSfx('invalid');
                    return; // Keep modal open
                  }
                  
                  Storage.set('player_profile_name', newName);
                  container.querySelector('#profile-name-display').textContent = newName;
                  Sounds.playSfx('success');
                }
                close();
              }
            }
```

### E. Modifications to `src/utils/i18n.js`
Add translations for the warning string:
* Under `"tr"`: `"profanity_not_allowed": "Profil ismi uygunsuz kelimeler içeremez!"`
* Under `"en"`: `"profanity_not_allowed": "Profile name cannot contain inappropriate words!"`

---

## 5. Vite & ES Module Compatibility Analysis

### 1. CommonJS Export Resolution
`leo-profanity` is distributed as CommonJS. When bundling with Vite, dynamic default exports might get nested under `.default`. The wrapper must handle this via:
`const filter = leoProfanity.default || leoProfanity;`

### 2. Dynamic `require` Issue in `loadDictionary`
In `leo-profanity`'s source code, `loadDictionary(name)` loads JSON dictionaries dynamically:
`this.list = require('./dictionary/' + name + '.json');`
* **Problem**: In a web browser environment, `require` is undefined. Rollup will flag this as a critical warning, and execution will fail if called.
* **Fix**: Do **not** call `.loadDictionary()` at runtime. The English dictionary is already statically loaded during the module's initial evaluation. For Turkish, we load the array from `tr.json` using ESM imports and pass it to `filter.add()`.

### 3. Dynamic Imports for Performance (Capacitor Optimization)
To avoid loading the profanity package and dictionary during the initial bootstrap of the app:
* We should use dynamic imports (`const { default: filter } = await import(...)`) inside `updateProfile` or the modal action.
* This ensures that the profanity library is only downloaded and parsed in memory when the user actually edits their profile, optimizing startup time and resource usage on mobile devices.

---

## 6. Structure of `verify_profanity.cjs`

This CommonJS script is placed in the root directory. It runs locally in Node.js to verify the filters.

```javascript
// verify_profanity.cjs
const filter = require('leo-profanity');
const path = require('path');

// 1. Configure libraries using CJS paths
filter.loadDictionary('en');

let trWords = [];
try {
  trWords = require('./src/utils/profanity/tr.json');
} catch (err) {
  console.warn('Warning: tr.json could not be loaded, using fallback list.');
  trWords = ['pislik', 'salak', 'aptal'];
}
filter.add(trWords);

// 2. Determine execution mode (CLI vs Test Suite)
const args = process.argv.slice(2);

if (args.length > 0) {
  // Manual word verification mode
  const input = args.join(' ');
  const hasProfanity = filter.check(input);
  const cleaned = filter.clean(input);
  console.log(`Input: "${input}"`);
  console.log(`Contains Profanity: ${hasProfanity ? 'YES' : 'NO'}`);
  console.log(`Cleaned Output: "${cleaned}"`);
} else {
  // Automated Test Suite mode (CI/CD friendly)
  console.log('Running Profanity Filter Test Suite...\n');

  const testCases = [
    { input: 'GoodPlayer', expected: false },
    { input: 'asshole123', expected: true }, // English profanity
    { input: 'ne haber pislik', expected: true }, // Turkish profanity
    { input: 'harika bir oyun', expected: false }
  ];

  let passed = 0;
  testCases.forEach((tc) => {
    const result = filter.check(tc.input);
    const success = result === tc.expected;
    if (success) passed++;
    console.log(`[${success ? 'PASS' : 'FAIL'}] Input: "${tc.input}" | Expected: ${tc.expected} | Got: ${result}`);
  });

  console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);
  process.exit(passed === testCases.length ? 0 : 1);
}
```
