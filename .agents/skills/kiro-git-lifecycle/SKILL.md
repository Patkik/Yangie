---
name: kiro-git-lifecycle
description: Automated Git Lifecycle Integration, two-stage staging and push verification workflow, and modern animation performance paradigms (Rive vs Lottie).
---

# Skill 5: Automated Git Lifecycle Integration & Animation Paradigms

**Target Tech Stack**: Git, Shell (PowerShell/Bash), GitHub Releases, Rive runtime  
**Scope**: Automatically keeping the repository synchronized, executing dry-run verifications, and selecting high-performance runtime animation engines.

## 1. Engineering Directives

### A. The Two-Stage Staging Workflow
1. **Staging Phase (Write & Refactor)**:
   - Create, edit, and verify all development files inside modular files (`/assets/css/`, `/assets/js/audio/`, `/assets/js/three/`, `/assets/js/services/`).
   - Never write untested or breaking code directly into production assets without verifying syntax.
2. **Verification Phase (Dry Run & Self-Healing)**:
   - Execute programmatic validations (e.g. `./gradlew assembleDebug` for Android/Kotlin or JS/CSS syntax checks).
   - If the compiler fails, read the stack trace, fix the bug automatically, and retry until exit code is 0.
3. **Push Phase (Git Sync)**:
   - Immediately stage, commit, and push to GitHub:
     ```bash
     git add .
     git commit -m "feat(scope): concise description"
     git push origin main
     ```
4. **Confirmation Phase**:
   - Provide a 2-sentence visual overview of the integrated features and print the short Git commit hash.

---

## 2. Animation Performance Paradigm Shift (Rive `.riv` vs. Lottie `.json`)

When integrating character animations, vector transitions, or onboarding sequences:
- **Prioritize Rive (`.riv`) over Lottie (`.json`)**:
  - **Memory & Parsing**: Lottie JSON files require parsing large textual JSON trees at runtime, consuming up to **23MB of Java heap** on mobile devices and keeping a persistent `requestAnimationFrame` thread running.
  - **Compiled Binary Engine**: Rive files are compact binary assets (**3-5x smaller**) that run on a compiled C++/WASM engine with a native State Machine.
  - **Zero Idle CPU**: When a state in Rive is idle, the animation loop pauses completely (**0% CPU overhead**), saving mobile battery and preventing background thermal throttling.
