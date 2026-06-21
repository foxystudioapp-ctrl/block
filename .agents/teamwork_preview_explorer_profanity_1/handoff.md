# Handoff Report: Profanity Filter Integration Investigation

## 1. Observation
We observed the following files and code snippets:
* **`package.json`**:
  * Runs as ES module: `"type": "module"` (line 5).
  * Lacks `leo-profanity` in dependencies (lines 14-27).
* **`src/screens/profile.js`**:
  * Save action in edit profile modal (lines 204-219):
    ```javascript
    { 
      text: t('save'), 
      primary: true, 
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
    }
    ```
* **`src/state/playerState.js`**:
  * Employs a singleton class `PlayerState`. The `updateProfile` method is synchronous and does not validate inputs (lines 292-296):
    ```javascript
    updateProfile(name, title) {
      this.state.profileName = name;
      this.state.profileTitle = title;
      this.save();
    }
    ```
* **`src/utils/i18n.js`**:
  * Employs dictionaries for multi-language translation (lines 1-100 and lines 2600-2700).

---

## 2. Logic Chain
1. **Integration Target**: We need a profanity check before updating names.
2. **Dynamic Require Limitation**: `leo-profanity` loads dictionaries via `require('./dictionary/' + name + '.json')` dynamically. In a browser/Vite environment, `require` is not defined, which will trigger runtime crashes if called.
3. **Dictionary Strategy**:
   * English is loaded statically on initialization inside `leo-profanity` package.
   * Turkish is not built-in, so we must add it using `.add()`.
   * We will create a local JSON file (`src/utils/profanity/tr.json`) containing Turkish profanity. This file can be statically imported using ESM in the browser, and required using CommonJS in `verify_profanity.cjs`.
   * By using ESM import/reading of `tr.json` and calling `filter.add(trWords)`, we completely avoid calling `.loadDictionary()` at runtime, thus bypassing the dynamic `require` browser crash.
4. **UX Integration Point**:
   * If we perform checks inside the UI modal event listener (Option A), we can show an error toast (`Toast.show`) and a warning sound (`Sounds.playSfx('invalid')`) while keeping the modal open (`return` without calling `close()`).
   * Performing this check dynamically via a hybrid approach ensures the state is secure, and the UI remains interactive and user-friendly.

---

## 3. Caveats
* We assumed that the local network context restricts installation of the NPM package during our exploration, so we did not run `npm install`.
* The exact contents of the Turkish dictionary must be curated by the project owner; a placeholder dictionary containing common examples (`pislik`, `salak`, `aptal`) is supplied for reference.

---

## 4. Conclusion
Integrating `leo-profanity` in Vite requires avoiding `loadDictionary` at runtime to prevent browser runtime crashes with dynamic `require`. We should wrap the import inside a custom utility `src/utils/profanityFilter.js` that loads the English dictionary automatically (default package behavior) and merges a Turkish JSON array list via `filter.add()`. Validation should occur inside `PlayerState.updateProfile`, returning success/failure, and the UI should dynamically import the validator and toast libraries, keeping the name edit modal open on validation failure for a superior UX.

---

## 5. Verification Method
1. **Automated Verification**:
   * Run the CommonJS verification script: `node verify_profanity.cjs` (without arguments) in the project root. It should execute the test cases and exit with status code `0`.
   * Run a specific word check: `node verify_profanity.cjs "badword"` or `node verify_profanity.cjs "pislik"`. It should detect the profanities.
2. **Manual Verification**:
   * Run the app in development: `npm run dev`
   * Navigate to the Profile tab.
   * Edit name, set it to "pislik" (Turkish) or "asshole" (English), and click save.
   * Verify that the profile modal stays open, a red toast alert warning is shown, an invalid sound plays, and the name is **not** updated in the header.
