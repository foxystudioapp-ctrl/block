# Handoff Report: Profanity Filter Investigation

This report summarizes the findings of the investigation into integrating the `leo-profanity` package to filter profile name updates in the Vite + Capacitor app.

---

## 1. Observation

- **Project Config**: In `package.json` line 5, the project uses `"type": "module"`. It does not contain `leo-profanity` in its dependencies yet.
- **Profile Name Input and Save Action**:
  - In `src/screens/profile.js` line 199–220, the modal save callback is:
    ```javascript
    actions: [
      { text: t('cancel'), onClick: (close) => close() },
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
    ]
    ```
- **State Management**:
  - In `src/state/playerState.js` line 292–296, the profile update is implemented as:
    ```javascript
    updateProfile(name, title) {
      this.state.profileName = name;
      this.state.profileTitle = title;
      this.save();
    }
    ```
- **External Dependency (`leo-profanity`)**:
  - `leo-profanity` is a CommonJS package. It loads dictionaries dynamically inside `loadDictionary()` using `require()`. It has built-in support for English (`en`), French (`fr`), Russian (`ru`), and Canadian French (`fr-ca`). It does not support Turkish (`tr`) natively.
  - Runtime environment is a browser/webview (Vite client-side bundle) where CommonJS `require()` is undefined.

---

## 2. Logic Chain

1. **Turkish Language Support**: Because `leo-profanity` does not natively have a Turkish dictionary (see Observation 4), we must manually define/load a list of Turkish profanity words and inject them via the `filter.add()` method alongside the English dictionary.
2. **ESM/Vite Compatibility**: Since the package is CommonJS and executes `loadDictionary` (using dynamic `require`) in its main file (see Observation 4), calling `import filter from 'leo-profanity'` will trigger runtime crashes in the browser. 
3. **Bypass Strategy**: We can resolve this bundling error by:
   - Importing the raw class directly: `import Profanity from 'leo-profanity/lib/profanity'`.
   - Statically importing the JSON dictionary: `import enWords from 'leo-profanity/lib/dictionary/en.json'`.
   - Creating our own `ProfanityFilter` instance and calling `add()` for English and custom Turkish word arrays.
4. **Validation Location**:
   - In `profile.js` line 207, the save button `onClick` event gets a `close` function parameter (see Observation 2). If we check the input name and it contains profanity, we can show a Toast and return immediately. Because `close()` is not called, the modal stays open for correction.
   - For defensive programming, updating `PlayerState.updateProfile` to also check the name (and mask it using `ProfanityFilter.clean` as a fallback) ensures that bad names are never persisted, even if updated outside the UI screen.
5. **Node Verification Script**: Because `"type": "module"` is configured in `package.json` (see Observation 1), Node expects CommonJS files to use `.cjs` extension. Thus, the verification script must be named `verify_profanity.cjs`.

---

## 3. Caveats

- We did not compile or test the project locally with `npm run build` because we are running in read-only investigation mode.
- Dictionaries are stored in memory. The memory footprint of the English and Turkish lists is negligible (~several kilobytes), but large dictionary lists could slightly increase bundle size.
- Turkish profanity has many suffix variations (agglutinative language). A static word list may not catch all variants. A more sophisticated regex or root-word matching may be required for 100% coverage, but the standard `leo-profanity` substring check is a solid starting point.

---

## 4. Conclusion

- We need to write a custom, ESM-safe wrapper utility `src/utils/profanity.js` that bypasses `leo-profanity`'s standard dynamic loader by importing the class and dictionary JSON directly.
- The UI modal save button `onClick` callback in `src/screens/profile.js` should check the name and conditionally block modal closing while showing a Toast.
- A Node-executable `verify_profanity.cjs` script should be placed in the project root to verify the filter in isolation.

---

## 5. Verification Method

To verify the integration:
1. Run the Node script: `node verify_profanity.cjs`. It should print test output and exit with code 0:
   ```bash
   node verify_profanity.cjs
   ```
2. Build the project using Vite to ensure no ESM/CommonJS compilation crashes:
   ```bash
   npm run build
   ```
3. Test manually in the app:
   - Go to Profile screen.
   - Click edit profile name.
   - Try to save a name containing an English profanity word (e.g. `shit`) or Turkish (e.g. `salak`).
   - The modal should remain open, and a Toast alert should be displayed.
