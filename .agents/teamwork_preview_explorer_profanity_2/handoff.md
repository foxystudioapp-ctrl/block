# Handoff Report: Profanity Filter Investigation

## 1. Observation
- `package.json` contains `"type": "module"` and `"dependencies"` including Firebase, Capacitor packages, and Tailwindcss, but lacks any profanity filtering packages.
- `src/screens/profile.js` contains the profile name edit modal on lines 193–220:
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
- `src/state/playerState.js` contains `updateProfile` method on lines 292–296:
  ```javascript
  292:   updateProfile(name, title) {
  293:     this.state.profileName = name;
  294:     this.state.profileTitle = title;
  295:     this.save();
  296:   }
  ```
- `src/utils/i18n.js` contains the dictionary translations for `"tr"` and `"en"`.
- Attempts to install `leo-profanity` using `npm install` were started but timed out waiting for user confirmation.

---

## 2. Logic Chain
- **Step 1**: To support profanity filtering in the application, we need to choose a client-side compatible library. `leo-profanity` is an NPM package that can be bundled into the application. (Reference: Section 1.1)
- **Step 2**: The app uses ES Modules, and runs in client-side browser/Capacitor environments. CommonJS modules like `leo-profanity` loaded in Vite must not perform dynamic filesytem operations (like dynamic `require` in `loadDictionary`). (Reference: Section 5.1)
- **Step 3**: Because `leo-profanity` does not natively support Turkish built-in lists, we must construct a custom Turkish wordlist `tr-profanity.json` and load it statically using `import trWords from './tr-profanity.json'`. This avoids the dynamic `require` bug during compilation. (Reference: Section 2)
- **Step 4**: Validation should happen inside both the state manager (`playerState.js`) and screen handler (`profile.js`). Keeping the validation inside `PlayerState.updateProfile` keeps the state manager as the source of truth, returning a boolean indicating if saving succeeded. (Reference: Section 3)
- **Step 5**: The UI handler in `profile.js` should check that boolean. If `false`, it keeps the modal open and shows a localized toast error. This prevents losing user input. (Reference: Section 3)
- **Step 6**: To allow test runners and pre-commit checks, we can construct `verify_profanity.cjs` in the root using CommonJS. It can load the Turkish dictionary file and test standard strings. (Reference: Section 4)

---

## 3. Caveats
- Since `npm install` was not completed due to timeout, the exact internal behavior of `leo-profanity` was deduced from package documentation and community knowledge of Vite dynamic require limitations.
- The list of Turkish profanity words has not been created; a placeholder dictionary structure is proposed.
- We assume that standard translation procedures should be followed in `src/utils/i18n.js` to add the toast warning message.

---

## 4. Conclusion
Integrating `leo-profanity` requires:
1. Adding `"leo-profanity": "^1.4.1"` to `package.json` dependencies.
2. Creating `src/utils/tr-profanity.json` and a wrapper `src/utils/profanityFilter.js`.
3. Updating `PlayerState.updateProfile` to check the name and return a boolean.
4. Modifying `profile.js` to check the returned boolean, showing a localized toast, and conditionally keeping the modal open.
5. Creating `verify_profanity.cjs` in the root directory to run local testing/CI validation.

---

## 5. Verification Method
1. **To verify the CJS test script**:
   Run `node verify_profanity.cjs` in the root directory and ensure the test suite reports:
   - Safe words like "Hello World" pass as clean.
   - Known bad words like "shit" and Turkish bad words are flagged.
2. **To verify the Vite build**:
   Run `npm run build` after implementing. Ensure Vite compiles without dynamic module warning/error issues.
3. **To verify the runtime behavior (Capacitor/Browser)**:
   Open the profile page, edit name to contain "shit" or a Turkish profanity, and verify:
   - The toast alert "Uygunsuz isimler kullanılamaz!" (or English equivalent) is shown.
   - The edit modal remains open with the input intact.
   - The profile name in playerState/Storage remains unchanged.
