# Analysis: Profanity Filter Integration using 'leo-profanity'

## Executive Summary
This report analyzes the integration of the `leo-profanity` npm package to filter profile name updates in our Vite + Capacitor app. The app uses ES modules, bundles assets client-side, and runs on mobile environments (Android/iOS) via Capacitor. 

We recommend installing `leo-profanity`, creating a local Turkish dictionary, configuring the library to run client-side without dynamic loading, performing state-level and UI-level validation, and creating a CLI test runner.

---

## 1. Codebase Investigation

### 1.1 `package.json`
- **Current State**: The project uses ES modules (`"type": "module"`) and Vite 8 for bundling. `leo-profanity` is not currently listed.
- **Action**: Add `leo-profanity` as a regular dependency (since it will be bundled for client-side use):
  ```json
  "dependencies": {
    ...
    "leo-profanity": "^1.4.1"
  }
  ```

### 1.2 `src/screens/profile.js`
- **Current State**: Lines 193-230 handle the name change modal save action:
  ```javascript
  207:               onClick: (close) => {
  208:                 const input = document.getElementById('name-edit-input');
  209:                 if (input && input.value.trim().length > 0) {
  210:                   const newName = input.value.trim();
  211:                   PlayerState.updateProfile(newName, PlayerState.state.profileTitle);
  212:                   Storage.set('player_profile_name', newName);
  213:                   container.querySelector('#profile-name-display').textContent = newName;
  214:                   Sounds.playSfx('success');
  215:                 }
  216:                 close();
  217:               }
  ```
- **Action**: Modify the save action to check the result of name validation before updating storage, updating the DOM, or closing the modal.

### 1.3 `src/state/playerState.js`
- **Current State**: Lines 292-296 update the player's profile name in memory and trigger auto-saving:
  ```javascript
  292:   updateProfile(name, title) {
  293:     this.state.profileName = name;
  294:     this.state.profileTitle = title;
  295:     this.save();
  296:   }
  ```
- **Action**: Modify `updateProfile` to perform backend state-level validation and return `true` or `false` to indicate if the profile update succeeded.

---

## 2. Configuration for English & Turkish Profanity
`leo-profanity` loads its default English dictionary automatically on import. It does not have a built-in Turkish dictionary. 

To support both English and Turkish profanity:
1. Create a Turkish dictionary file `src/utils/tr-profanity.json` containing an array of offensive words:
   ```json
   [
     "aptal",
     "salak",
     "pislik"
   ]
   ```
2. Create a utility wrapper `src/utils/profanityFilter.js` that imports the package, loads the Turkish list, adds it to the filter, and exports helper functions:
   ```javascript
   import filter from 'leo-profanity';
   import trWords from './tr-profanity.json';

   // Add Turkish words to the default English wordlist
   filter.add(trWords);

   export const ProfanityFilter = {
     check: (text) => filter.check(text),
     clean: (text, replaceWith = '*') => filter.clean(text, replaceWith),
     add: (words) => filter.add(words),
     remove: (words) => filter.remove(words)
   };
   ```

---

## 3. Validation Check Location & UX Flow
We recommend a **hybrid validation architecture**:

1. **State-Level Guard (`playerState.js`)**:
   `PlayerState.updateProfile` should act as a guardian of the state. If the name is inappropriate, it rejects the update and returns `false`. This keeps state logic clean and prevents invalid data from ever being written to `Storage` or memory.
2. **UI-Level Reaction (`profile.js`)**:
   The modal save logic handles the rejection by showing a toast to the user and keeping the modal open. This provides the best UX because the user's input is not lost, and they can edit it immediately.

### Localized Toast Error
In `src/utils/i18n.js`, add translation keys for the profanity warning:
- **Turkish (`tr`)**: `"inappropriate_name_error": "Uygunsuz isimler kullanılamaz!"`
- **English (`en`)**: `"inappropriate_name_error": "Inappropriate names are not allowed!"`

---

## 4. Structure of `verify_profanity.cjs` (CommonJS Test Runner)
Create `verify_profanity.cjs` in the root directory. It runs under Node.js for CLI testing or CI checks.

```javascript
const filter = require('leo-profanity');
const path = require('path');
const fs = require('fs');

// 1. Load the Turkish dictionary from the source code directory
let trWords = [];
try {
  const trDictPath = path.join(__dirname, 'src', 'utils', 'tr-profanity.json');
  if (fs.existsSync(trDictPath)) {
    trWords = JSON.parse(fs.readFileSync(trDictPath, 'utf8'));
  } else {
    // Basic fallback list for initial script setup testing
    trWords = ['aptal', 'salak', 'pislik'];
  }
} catch (err) {
  console.error('Failed to load Turkish dictionary:', err);
}

// 2. Configure leo-profanity
filter.add(trWords);

// 3. Automated Test Cases
const testCases = [
  { text: 'Hello World', expected: false },
  { text: 'shit', expected: true },        // English bad word
  { text: 'salak', expected: true },       // Turkish bad word
  { text: 'SuperPlayer99', expected: false }
];

let failed = 0;
console.log('Running profanity filter test suite...');
testCases.forEach(({ text, expected }) => {
  const isProfane = filter.check(text);
  if (isProfane === expected) {
    console.log(`✅ PASS: "${text}" -> Profane: ${isProfane}`);
  } else {
    console.error(`❌ FAIL: "${text}" -> Expected: ${expected}, Got: ${isProfane}`);
    failed++;
  }
});

// 4. CLI Argument Mode
const arg = process.argv[2];
if (arg) {
  const isProfane = filter.check(arg);
  console.log(`\nChecking command line input: "${arg}"`);
  console.log(`Result: ${isProfane ? 'BLOCKED ❌' : 'ALLOWED ✅'}`);
  if (isProfane) {
    console.log(`Cleaned output: "${filter.clean(arg)}"`);
  }
}

// 5. Exit Code based on test run success
if (failed > 0) {
  console.error(`\nTest suite failed with ${failed} failure(s).`);
  process.exit(1);
} else {
  console.log('\nAll tests completed successfully!');
  process.exit(0);
}
```

---

## 5. Vite & ES Module Compatibility Issues & Resolutions

### 5.1 Dynamic Require Errors in Client-side Bundle
- **The Issue**: Internally, `leo-profanity`'s `loadDictionary(name)` function is designed to load languages dynamically. If Vite's Rollup configuration encounters any dynamic file reading (e.g. `require('./dictionary/' + name + '.json')`), it will fail to compile or throw runtime exceptions in the browser since the browser doesn't have a filesystem (`fs`) or dynamic `require` resolver.
- **The Resolution**: Avoid calling `filter.loadDictionary('tr')` or other internal dynamic loader methods. Instead, keep the default English dictionary (which is statically required by `leo-profanity` and bundled) and load the Turkish words through an ES module import of the local JSON file (`import trWords from './tr-profanity.json'`), then use `filter.add(trWords)`. This completely bypasses the dynamic dynamic-loader code paths.

### 5.2 CommonJS Interoperability
- **The Issue**: `leo-profanity` exports via `module.exports = filter` (CommonJS). Vite will auto-wrap this during esbuild pre-bundling. However, direct default imports can occasionally result in errors depending on bundler configurations (e.g. `TypeError: filter.check is not a function` if the default import resolved to `{ default: filter }`).
- **The Resolution**: Implement a safe reference resolution in `profanityFilter.js`:
  ```javascript
  import leoProfanity from 'leo-profanity';
  const filter = leoProfanity.default || leoProfanity;
  ```

### 5.3 Initial Bundle Size Optimization (Dynamic Loading)
- **The Issue**: Loading a large JSON dictionary list during app initialization will increase the initial bundle size, hurting startup speed.
- **The Resolution**: Use Vite's support for dynamic imports. We can dynamically load `tr-profanity.json` only when the name edit modal is opened:
  ```javascript
  // Inside profile.js
  const { default: trWords } = await import('../utils/tr-profanity.json');
  ProfanityFilter.add(trWords);
  ```

### 5.4 Capacitor Offline Mode
- **The Issue**: Capacitor packages code to run locally on devices. Remote API calls or CDN fetches will fail if the user is offline.
- **The Resolution**: All dictionary assets must remain local to the source directory (`src/utils/`) so they are bundled into the app binary.

---

## 6. Proposed Implementation Changes

### 6.1 `src/state/playerState.js`
```javascript
// Add import at the top
import { ProfanityFilter } from '../utils/profanityFilter.js';

// Modify updateProfile
  updateProfile(name, title) {
    if (ProfanityFilter.check(name)) {
      return false; // validation failed
    }
    this.state.profileName = name;
    this.state.profileTitle = title;
    this.save();
    return true;
  }
```

### 6.2 `src/screens/profile.js`
```javascript
// Modify modal action onClick
            { 
              text: t('save'), 
              primary: true, 
              onClick: (close) => {
                const input = document.getElementById('name-edit-input');
                if (input && input.value.trim().length > 0) {
                  const newName = input.value.trim();
                  
                  // Run state validation
                  const success = PlayerState.updateProfile(newName, PlayerState.state.profileTitle);
                  if (!success) {
                    import('../components/toast.js').then(({ Toast }) => {
                      Toast.show(t('inappropriate_name_error') || 'Uygunsuz isimler kullanılamaz!', 'error');
                    });
                    return; // Do not close the modal or update display
                  }
                  
                  Storage.set('player_profile_name', newName);
                  container.querySelector('#profile-name-display').textContent = newName;
                  Sounds.playSfx('success');
                }
                close();
              }
            }
```
