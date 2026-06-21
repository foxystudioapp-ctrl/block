# Analysis: 'leo-profanity' Integration for Profile Name Filtering

This analysis details how to integrate the `leo-profanity` npm package to filter profile name updates in our Vite + Capacitor app.

---

## 1. File Examinations & Current State

### `package.json`
- **Current State**: Located at `c:\Users\askar\OneDrive\Masaüstü\block\package.json`. It specifies `"type": "module"`, indicating that all `.js` files in the project are treated as ES Modules. It contains dependencies like `@capacitor/core`, `@tailwindcss/vite`, and `firebase`, but **does not** yet include `leo-profanity`.
- **Proposed Action**: Install `leo-profanity` by adding it to `package.json` under `dependencies` (e.g. `"leo-profanity": "^1.7.0"`).

### `src/screens/profile.js`
- **Current State**: Contains the UI for profile editing.
  - At lines 184–187, the edit button triggers a click event listener:
    ```javascript
    <h2 class="text-2xl font-black tracking-tight mb-1 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1" id="profile-name-edit">
      <span id="profile-name-display">${PlayerState.state.profileName}</span>
      <span class="material-symbols-outlined text-sm text-gray-400">edit</span>
    </h2>
    ```
  - At lines 193–230, the click event opens a edit name modal via `createModal()`:
    ```javascript
    onClick: (close) => {
      const input = document.getElementById('name-edit-input');
      if (input && input.value.trim().length > 0) {
        const newName = input.value.trim();
        PlayerState.updateProfile(newName, PlayerState.state.profileTitle);
        Storage.set('player_profile_name', newName);
        container.querySelector('#profile-name-display').textContent = newName;
        Sounds.playSfx('success');
      }
      close();
    }
    ```
- **Proposed Action**: Intercept the save action here, check the input using our profanity utility, and if inappropriate, show a toast alert and return early without calling `close()`.

### `src/state/playerState.js`
- **Current State**: Manages player state including `profileName`.
  - The profile update method is on lines 292–296:
    ```javascript
    updateProfile(name, title) {
      this.state.profileName = name;
      this.state.profileTitle = title;
      this.save();
    }
    ```
- **Proposed Action**: As an extra layer of defense, update `updateProfile` to return a validation status (`true` if updated, `false` or throwing an error if blocked).

---

## 2. 'leo-profanity' Configuration & Language Support

`leo-profanity` includes built-in dictionaries for English (`en`), French (`fr`), and Russian (`ru`). It **does not** have a built-in Turkish dictionary. 

To support both **English** and **Turkish** profanity:
1. Load the default English dictionary using `.loadDictionary('en')` (or manually adding it in client-side wrapper).
2. Manually add a Turkish profanity list (e.g. `trBadWords` array) to the dictionary using the `.add(words)` method.
3. Configure the tool to perform case-insensitive, accents-ignored checks.

---

## 3. Location of the Validation Check

### Option A: Inside the Edit Name Modal Save Logic (`profile.js`)
- **Pros**: Direct UI interaction. If validation fails, we can show a Toast and **not** call the `close()` callback of the modal. This keeps the modal open and allows the user to correct their input without losing their work.
- **Cons**: Only filters names updated from this specific modal.

### Option B: Inside `PlayerState.updateProfile` (`playerState.js`)
- **Pros**: Centralized validation. Any name change throughout the app (setup, sync, etc.) is automatically checked. Prevents invalid state from being saved to `Storage` or remote databases.
- **Cons**: `playerState.js` is a state layer, and showing UI Toast alerts directly from it violates separation of concerns.

### Recommended Hybrid Solution
1. Create a centralized profanity utility in `src/utils/profanity.js`.
2. Perform the validation check inside **`src/screens/profile.js`** inside the `createModal` save handler. If it fails, show a localized error toast and return immediately to keep the modal open.
3. Inside **`src/state/playerState.js`**, update `updateProfile` to also run the check and return a boolean/status or perform name masking as a secondary safeguard:
   ```javascript
   import { ProfanityFilter } from '../utils/profanity.js';

   updateProfile(name, title) {
     if (ProfanityFilter.check(name)) {
       // Either mask it:
       this.state.profileName = ProfanityFilter.clean(name);
     } else {
       this.state.profileName = name;
     }
     this.state.profileTitle = title;
     this.save();
   }
   ```

---

## 4. Vite + ES Modules Compatibility Issues & Workarounds

### The Problem
`leo-profanity` is a CommonJS package. When imported in a client-side Vite project using:
```javascript
import filter from 'leo-profanity';
```
Vite's builder pre-bundles it using `esbuild`. However, `leo-profanity`'s `loadDictionary` method dynamically requires JSON files using:
```javascript
const dictionary = require('./dictionary/' + name + '.json');
```
Vite runs in a browser-side client environment (and Capacitor web views) where CommonJS `require` is not available at runtime. The dynamic import structure prevents static analysis, leading to a build error or a runtime crash: `ReferenceError: require is not defined`.

### The Workaround
To bypass the dynamic `require` code in the package entrypoint, we can:
1. Import the `Profanity` class constructor directly from its file:
   ```javascript
   import Profanity from 'leo-profanity/lib/profanity';
   ```
2. Statically import the English JSON dictionary file using Vite's native JSON importing capability:
   ```javascript
   import enWords from 'leo-profanity/lib/dictionary/en.json';
   ```
3. Combine them in a custom wrapper `src/utils/profanity.js`:
   ```javascript
   import Profanity from 'leo-profanity/lib/profanity';
   import enWords from 'leo-profanity/lib/dictionary/en.json';
   import { trWords } from './trWords.js'; // Local custom Turkish profanity list

   const filter = new Profanity();
   filter.add(enWords);
   filter.add(trWords);

   export const ProfanityFilter = {
     check: (text) => filter.check(text),
     clean: (text, replaceChar = '*') => filter.clean(text, replaceChar),
     add: (words) => filter.add(words),
     remove: (words) => filter.remove(words)
   };
   ```

---

## 5. Design of `verify_profanity.cjs`

Because the root directory specifies `"type": "module"`, any script that runs in Node using standard CommonJS (`require`) must end with the `.cjs` extension. This script is designed to test and verify the profanity filtering behavior directly in Node.

```javascript
// verify_profanity.cjs
const filter = require('leo-profanity');

// Localized Turkish bad words list (subset for verification)
const turkishBadWords = [
  'salak', 'aptal', 'şerefsiz', 'piç', 'gerizekalı', 'amcık', 'göt', 'yavşak', 'siktir', 'sik'
];

// 1. Load English dictionary
filter.loadDictionary('en');

// 2. Add Turkish words
filter.add(turkishBadWords);

// 3. Test Cases
const testCases = [
  { text: 'Hello, what a beautiful day!', shouldBeClean: true },
  { text: 'Go away you piece of shit', shouldBeClean: false },
  { text: 'Bugün hava çok güzel!', shouldBeClean: true },
  { text: 'Sen tam bir gerizekalı ve salaksın', shouldBeClean: false }
];

console.log('=== Profanity Filter Verification ===');
let successCount = 0;

testCases.forEach((tc, idx) => {
  const hasProfanity = filter.check(tc.text);
  const cleanedText = filter.clean(tc.text);
  const isClean = !hasProfanity;
  const passed = isClean === tc.shouldBeClean;
  
  if (passed) successCount++;
  
  console.log(`\nTest #${idx + 1}:`);
  console.log(`  Input:    "${tc.text}"`);
  console.log(`  Cleaned:  "${cleanedText}"`);
  console.log(`  Result:   ${passed ? 'PASSED ✅' : 'FAILED ❌'} (Has Profanity: ${hasProfanity})`);
});

console.log(`\nResults: ${successCount}/${testCases.length} tests passed.`);

if (successCount === testCases.length) {
  console.log('All tests passed successfully! 🎉');
  process.exit(0);
} else {
  console.error('Some tests failed. Check implementation.');
  process.exit(1);
}
```

---

## 6. Implementation Steps (Proposal)

1. **Dependency Installation**:
   - Run `npm install leo-profanity --save` or add `"leo-profanity": "^1.7.0"` to `package.json` and run install.
2. **Turkish Dictionaries**:
   - Create `src/utils/trWords.js` or `src/utils/trWords.json` containing a curated list of Turkish bad words.
3. **Utility Wrapper**:
   - Create `src/utils/profanity.js` containing the Vite-safe ES Modules instantiation of `leo-profanity` class.
4. **Integration in State**:
   - Update `updateProfile` in `src/state/playerState.js` to use `ProfanityFilter.check` (either blocking or masking as secondary security).
5. **Integration in UI Screen**:
   - Update `src/screens/profile.js` to run `ProfanityFilter.check(newName)` in the Modal's save logic. Display toast notification (`t('profanity_not_allowed')`) if check fails, and prevent modal closure.
6. **Local verification script**:
   - Add `verify_profanity.cjs` to the project root directory.
