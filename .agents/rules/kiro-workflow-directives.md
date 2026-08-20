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

### C. Push Phase (Git Sync)
- Once verified, stage the modified files: `git add <files>`.
- Commit with conventional commit scopes:
  - `feat(ui): ...`
  - `feat(audio): ...`
  - `feat(three): ...`
  - `fix(updater): ...`
  - `chore(security): ...`
- Push immediately to remote: `git push origin main`.

### D. Confirmation Phase
- Provide a concise 2-sentence visual overview of the integrated features.
- Print the latest Git commit hash (`git rev-parse --short HEAD`) to confirm remote synchronization.

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
