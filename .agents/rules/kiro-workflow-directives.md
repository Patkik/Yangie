# Kiro Development & Agent Lifecycle Directives

You must follow this lifecycle loop for every file modification, bugfix, or feature integration in the Kiro Space Capsule / Sanctuary project:

## 1. Lifecycle Directives

### A. Staging Phase (Write & Refactor)
- Write your code changes into modular, structured files (`/assets/css/`, `/assets/js/audio/`, `/assets/js/three/`, `/assets/js/services/`).
- Never write broken or untested code directly into production files without syntax verification.

### B. Verification Phase (Dry Run & Self-Healing Loop)
- Validate JavaScript, CSS, and HTML for syntax integrity.
- For any native Android (`.kt`, `.xml`, `build.gradle.kts`) modifications, run `./gradlew assembleDebug` to test compilation.
- **Self-Healing Loop**: If the compiler returns an error, immediately inspect the stack trace, fix the root cause, and re-compile until the build passes with exit code 0.

### C. Push Phase & Automated Tag Iteration (Mandatory)
Whenever any update, bugfix, or feature is pushed, the agent MUST automatically iterate the SemVer release tag:
1. **Version Calculation**: Retrieve the current tag (`git tag -l "v*" --sort=-v:refname` or `version.json`) and increment the patch version (e.g. `v1.0.5` ➔ `v1.0.6`).
2. **Version Synchronization**: Update the version number across:
   - `android-app/app/src/main/assets/version.json`
   - `android-app/app/src/main/assets/index.html` (Badge `settings-current-ver-badge` & `settings-val-version`)
   - `android-app/app/src/main/assets/js/state.js` (`installedVersion` default)
   - `android-app/app/build.gradle.kts` (`versionName`)
3. **Commit & Tag**:
   - `git add .`
   - `git commit -m "feat/fix(scope): description"`
   - `git tag -a v1.0.X -m "Release v1.0.X: <summary>"`
4. **Push**:
   - `git push origin main && git push origin v1.0.X`

### D. Confirmation & Mandatory Walkthrough Audit (Never Skip)
At the conclusion of every feature integration, bugfix, or refactoring task, the AI agent MUST ALWAYS compile and output a structured Walkthrough Audit:
1. **Walkthrough Document**: Create or update the `walkthrough.md` artifact detailing architectural changes, visual/audio mechanics tested, and verification results.
2. **Visual & Auditory Overview**: Provide a concise breakdown of how the changes behave visually, physically, and aurally.
3. **Automated Verification Proof**: Document the exact test/build verification commands run (`./gradlew test assembleDebug`) and verify exit code 0.
4. **Git Sync Confirmation**: Print the newly tagged release version (e.g. `v1.2.0`), short commit hash (`git rev-parse --short HEAD`), and remote push status.

---

## 2. Design Tokens: The Kiro Signature Palette

| Hex Code | Name | UI Application |
|---|---|---|
| `#4EC9B0` | **Mint-teal** | Primary brand glow, status progress bars, and calming feedback |
| `#F5B7C0` | **Pastel pink** | Interactive accents, snack/feeding assets, and sweet highlights |
| `#CBA6F7` | **Lavender** | Secondary UI elements, accessory wardrobe, and cosmic depth |
| `#F0EDE8` | **Cream** | Off-white text and belly patch accents |
| `#1A3A3A` | **Obsidian** | Deep dark eyes and high-contrast details |
| `#0D1622` | **Twilight** | Capsule background gradient and deep space atmosphere |

---

## 3. Core Architecture & State Machine

- **Single State Machine**: Synchronize pet properties (`wellbeing`, `isSleeping`, `hasWellRestedBuff`, `mood`) across WebGL animations, procedural audio filters, and native notification bridges.
- **Security Boundaries**: Strictly enforce WebView sandboxing with `allowFileAccess = false`, `allowContentAccess = false`, and `MIXED_CONTENT_NEVER_ALLOW`.
