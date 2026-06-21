# Review Report

## Review Summary

**Verdict**: REQUEST_CHANGES

This review assessed the implementation of the profanity filter integration in the block repository. While the filter implements actual logic using `leo-profanity` and blocks both Turkish and English swear words in name editing, multiple major issues were found regarding correctness of testing, incomplete translation coverage, malformed internationalization metadata, and startup performance overhead.

---

## Findings

### [Major] Finding 1: Verification Script Does Not Test the Implementation Module
- **What**: The script `verify_profanity.cjs` does not import or test `src/utils/profanityFilter.js`. Instead, it instantiates `leo-profanity` separately, manually reads `tr-profanity.json`, and runs tests.
- **Where**: `verify_profanity.cjs`
- **Why**: This creates a testing gap. If the actual application helper `src/utils/profanityFilter.js` is misconfigured, fails to load, or behaves incorrectly, the verification script will still pass, self-certifying a broken implementation.
- **Suggestion**: Update `verify_profanity.cjs` to import the default export from `src/utils/profanityFilter.js` and use its `check` method rather than rebuilding the filter state in the test.

### [Major] Finding 2: Missing Translation Key `profanity_not_allowed` in 9 Languages
- **What**: The key `"profanity_not_allowed"` is missing from the translations of 9 out of 11 supported languages. It is only defined for `"tr"` and `"en"`.
- **Where**: `src/utils/i18n.js` (under language blocks for `"es"`, `"fr"`, `"de"`, `"it"`, `"pt"`, `"ru"`, `"ar"`, `"zh"`, and `"ur"`)
- **Why**: When a player using Spanish, French, or another unsupported language triggers the profanity filter error message, the UI will fall back to displaying the English string: `"Profile name cannot contain inappropriate words!"`.
- **Suggestion**: Add the translated version of `"profanity_not_allowed"` to all language dictionaries in `src/utils/i18n.js`.

### [Major] Finding 3: Malformed `availableLanguages` Object for Turkish
- **What**: The Turkish (`"tr"`) available language metadata block contains extraneous translation keys (`stat_classic_record`, `stat_hex_record`, etc.) containing Urdu text.
- **Where**: `src/utils/i18n.js` lines 5100-5117
- **Why**: This is dead weight in the codebase, indicating a copy-paste error during a translation merge. It bloats the bundle size and represents poor code quality.
- **Suggestion**: Clean up the `"tr"` object in `availableLanguages` to only contain `"code": "tr"` and `"name": "Türkçe"`.

### [Minor/Medium] Finding 4: Startup Performance Impact (Static Loading of Dictionaries)
- **What**: The profanity filter is loaded statically via `import` statements at the top level of `profanityFilter.js` which is imported in `playerState.js`.
- **Where**: `src/utils/profanityFilter.js` lines 1-8, `src/state/playerState.js` line 2
- **Why**: The `leo-profanity` package and the large English and Turkish dictionaries are bundled and parsed during application initialization, even though the profanity filter is only used when the user edits their name on the Profile screen. This increases the main bundle size and slows down the initial page load.
- **Suggestion**: Use dynamic imports (`await import(...)`) for `leo-profanity` and the JSON dictionaries, lazy-loading them only when name editing begins or when the edit name modal is opened.

### [Minor] Finding 5: Incomplete Profanity Filtering (Title Field Bypassed)
- **What**: The `PlayerStateManager.updateProfile` method accepts both `name` and `title` fields, but only checks the `name` field for profanity.
- **Where**: `src/state/playerState.js` lines 293-301
- **Why**: If a feature is introduced in the future that allows editing the player's title, or if this API is called directly by other game components, the profanity filter can be bypassed through the unchecked `title` field.
- **Suggestion**: Perform the profanity check on the `title` parameter as well: `if (profanityFilter.check(name) || profanityFilter.check(title))`.

---

## Verified Claims

- **Profanity checking works via `leo-profanity`** → Verified via static analysis of `verify_profanity.cjs`, `leo-profanity/src/index.js`, and `src/utils/profanityFilter.js` → **Pass**
- **Turkish profanity list includes common terms** → Verified via inspection of `src/utils/tr-profanity.json` → **Pass**

---

## Coverage Gaps

- **Dynamic Import Performance** — risk level: low — recommendation: accept risk or refactor to lazy load if startup performance constraints are strict.
- **Title Validation** — risk level: low — recommendation: update `updateProfile` to check `title` to prevent potential bypasses.

---

## Unverified Items

- **Command Line Executions (`node verify_profanity.cjs` & `npm run build`)** — reason not verified: Shell command execution permissions timed out on the runner environment. Static analysis indicates they should compile correctly, but live runtime execution was unverified.
