# Worker Task: Web Build, Capacitor Sync, and Android Release AAB

## Objective
Build the web assets, sync them to Capacitor, and package the release AAB bundle using Gradle.

## Steps
1. Run `npm run build` at project root `c:\Users\askar\OneDrive\Masaüstü\block`.
2. Run `npx cap sync android` at project root `c:\Users\askar\OneDrive\Masaüstü\block`.
3. Run `./gradlew bundleRelease` in directory `c:\Users\askar\OneDrive\Masaüstü\block\android`.
4. Verify the output bundle: check that `app-release.aab` or `app-release-unsigned.aab` exists in `c:\Users\askar\OneDrive\Masaüstü\block\android\app\build\outputs\bundle\release/`.
5. Return results including execution logs and paths to the generated bundle.

## Constraints
- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
