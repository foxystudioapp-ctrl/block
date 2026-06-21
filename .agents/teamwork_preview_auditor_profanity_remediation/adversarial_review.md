## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Low] Challenge 1: Leetspeak Mapping Completeness
- Assumption challenged: The leetspeak mapping covers all lookalike combinations.
- Attack scenario: An attacker could bypass the filter by using characters not defined in the mapping (e.g. `s!kt|r` or `s1kt1rr` or using other symbols like `|_|` for `u`).
- Blast radius: Low (allows custom username profanity bypass).
- Mitigation: Continuously expand the `leetspeakMap` or implement a similarity distance check against the dictionary.

### [Low] Challenge 2: Space Removal and Substring Concatenation
- Assumption challenged: Merging spaces handles spaced-out profanity without causing false positives.
- Attack scenario: Words split across normal sentences could concatenate to form a blocked word (e.g. "this is a test ..."). However, `normalizeText` replaces non-alphanumeric characters with spaces, and `tokens.join('')` concatenates all tokens. If a user inputs two normal words whose concatenation is a profanity, it will be blocked.
- Blast radius: Low (harmless sentences might be blocked).
- Mitigation: Only run concatenation checks on short inputs like username profiles (which typically do not contain full sentences).

## Stress Test Results

- `s1kt1r` (leetspeak) → expected blocked: true → actual: true → PASS
- `şalāk` (diacritics) → expected blocked: true → actual: true → PASS
- `s.i.k.t.i.r` (obfuscation) → expected blocked: true → actual: true → PASS
- `bisiklet` (false positive) → expected blocked: false → actual: false → PASS
- `tamam` (false positive) → expected blocked: false → actual: false → PASS

## Unchallenged Areas

- Dictionaries contents - The English and Turkish dictionaries contents themselves were not audited for exhaustive coverage of all existing profanity terms, only the code logic.
