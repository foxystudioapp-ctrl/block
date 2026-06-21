## 2026-06-13T19:05:34Z

You are the Worker. Your task is to implement the profanity filter integration in our Vite + Capacitor app (located at c:\Users\askar\OneDrive\Masaüstü\block\).

Follow these steps exactly:
1. Install the `leo-profanity` package using `npm install leo-profanity --save`.
2. Inspect the structure of `node_modules/leo-profanity/` to ensure we import it safely in Vite without triggering dynamic `require()` runtime crashes in the browser.
3. Create `src/utils/tr-profanity.json` containing a list of Turkish profane/inappropriate words (at least 15-20 common inappropriate words, including 'salak', 'aptal', 'şerefsiz', 'pislik', 'göt', 'yavşak', 'siktir', 'sik', 'amcık', 'piç').
4. Create a utility wrapper `src/utils/profanityFilter.js` that:
   - Imports the `Profanity` constructor class (from `leo-profanity/lib/profanity` or a safe export that avoids top-level dynamic require).
   - Statically imports English words from `leo-profanity/lib/dictionary/en.json`.
   - Statically imports Turkish words from `src/utils/tr-profanity.json`.
   - Initializes a filter instance, adds both English and Turkish dictionaries to it, and exports check/clean helper functions.
5. Modify `src/state/playerState.js`:
   - Import the profanity filter utility.
   - Update `updateProfile(name, title)` to check the name using the profanity filter.
   - If profanity is found, return `{ success: false, error: 'profanity' }`.
   - Otherwise, update the state, call `this.save()`, and return `{ success: true }`.
6. Modify `src/screens/profile.js`:
   - Locate the name edit modal save callback (`onClick` for the Save button).
   - Call `PlayerState.updateProfile(newName, PlayerState.state.profileTitle)`.
   - If the update is not successful (i.e. name contains profanity):
     - Show an error toast using `Toast.show(t('profanity_not_allowed') || 'Uygunsuz kelimeler içeren isimler kullanılamaz!', 'error')`.
     - Play a warning sound (e.g. `Sounds.playSfx('button-tap')`).
     - Return early without calling `close()`, so the modal remains open for the user to fix the name.
   - If successful:
     - Save `player_profile_name` in `Storage`.
     - Update the DOM `#profile-name-display`.
     - Play `success` SFX.
     - Close the modal by calling `close()`.
7. Modify `src/utils/i18n.js`:
   - Add translation key `"profanity_not_allowed"` under Turkish (e.g. "Uygunsuz kelimeler içeren isimler kullanılamaz!") and English (e.g. "Profile name cannot contain inappropriate words!").
8. Create `verify_profanity.cjs` in the project root directory:
   - It must be a CommonJS script.
   - It must import `leo-profanity` and configure it with English and Turkish dictionaries (reading from `src/utils/tr-profanity.json` or inline fallback).
   - It must run programmatic checks showing that:
     - At least 3 inappropriate words are blocked (e.g., 'asshole', 'salak', 'siktir').
     - At least 3 clean/normal names are allowed (e.g., 'Ahmet', 'John', 'Alice').
     - Exit with 0 on success, 1 on failure.
9. Verify by running:
   - `npm run build` (to ensure Vite compiles the project without any bundling/require issues).
   - `node verify_profanity.cjs` (to ensure the test script passes).
   - Report the output of both verification runs in your handoff.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes and verification results report to c:\Users\askar\OneDrive\Masaüstü\block\.agents\teamwork_preview_worker_profanity\handoff.md. Report completion when done.
