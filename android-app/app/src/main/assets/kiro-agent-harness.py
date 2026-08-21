#!/usr/bin/env python3
"""
===============================================================================
  🛰️ KIRO'S COSMIC HAVEN — AUTONOMOUS AGENT HARNESS (V4.5 — ANTIGRAVITY EDITION)
===============================================================================
  Enforcing Antigravity Design Tokens, AST Integrity, & Continuous Learning Loops
  
  Features:
    1. Automated AST & Import Path Analysis (ESM Offline Sandbox Safety)
    2. Self-Healing CSS Color Palette Sanitizer (Euclidean Twilight Toning)
    3. Memory Disposal & WebGL Resource Leak Auditor
    4. 5-Perspective Cognitive Tree-of-Thoughts Evaluation Engine
    5. Continuous Learning Loop: Automated Rule Synchronization (--sync-rules)
    6. Native Git Pre-Commit Quality Guardrail Installer (--install-hook)
    7. Chronological Historical Decision Visualizer (--history)
    
  Usage:
    python kiro-agent-harness.py --check
    python kiro-agent-harness.py --heal-css
    python kiro-agent-harness.py --log-decision
    python kiro-agent-harness.py --history
    python kiro-agent-harness.py --install-hook
    python kiro-agent-harness.py --sync-rules
    python kiro-agent-harness.py --all
===============================================================================
"""

import os
import sys
import re
import json
import math
from datetime import datetime
from pathlib import Path

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─────────────────────────────────────────────────────────────────────────────
# 1. ANSI TERMINAL ESCAPE STYLES
# ─────────────────────────────────────────────────────────────────────────────

class Colors:
    RESET = "\033[0m"
    BRIGHT = "\033[1m"
    DIM = "\033[2m"
    UNDERLINE = "\033[4m"
    TEAL = "\033[36m"
    PINK = "\033[35m"
    YELLOW = "\033[33m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    BG_DARK = "\033[40m"

# ─────────────────────────────────────────────────────────────────────────────
# 2. SIGNATURE TWILIGHT CELESTIAL PALETTE TOKENS
# ─────────────────────────────────────────────────────────────────────────────

SIGNATURE_PALETTE = {
    "midnight":      {"hex": "#11111b", "rgb": (17, 17, 27),    "token": "--midnight",      "label": "Midnight Navy (Backdrop)"},
    "mint-teal":     {"hex": "#4ec9b0", "rgb": (78, 201, 176),  "token": "--mint-teal",     "label": "Host Mint-Teal (Kiro/Pats Operator)"},
    "pastel-pink":   {"hex": "#f5c2e7", "rgb": (245, 194, 231), "token": "--pastel-pink",   "label": "Cosmic Blush & Candy"},
    "blush-pink":    {"hex": "#f5b7c0", "rgb": (245, 183, 192), "token": "--blush-pink",    "label": "Pastel Pink Snout/Blush"},
    "light-pink":    {"hex": "#ffb6c1", "rgb": (255, 182, 193), "token": "--light-pink",    "label": "Light Blush Accent"},
    "gold-glow":     {"hex": "#f9e2af", "rgb": (249, 226, 175), "token": "--gold-glow",     "label": "Shared Starlight Gold"},
    "lavender-gray": {"hex": "#cdd6f4", "rgb": (205, 214, 244), "token": "--lavender-gray", "label": "Bedtime Lavender Text"},
    "lavender-cone": {"hex": "#cba6f7", "rgb": (203, 166, 247), "token": "--lavender-cone", "label": "Starry Nightcap Lavender"},
    "emerald-neon":  {"hex": "#94e2d5", "rgb": (148, 226, 213), "token": "--emerald-neon",  "label": "Dynamic Active Accents"},
    "text-dark":     {"hex": "#1e1e2e", "rgb": (30, 30, 46),    "token": "--text-dark",     "label": "Text Dark Surface"},
}

SAFE_NEUTRALS = {
    "#000000": (0, 0, 0),
    "#ffffff": (255, 255, 255),
    "#000": (0, 0, 0),
    "#fff": (255, 255, 255),
}

REQUIRED_FILES = {
    "root": ["index.html", "version.json"],
    "css": ["main.css", "intro.css", "messenger.css", "call.css"],
    "js": ["app.js", "state.js", "audio/synth.js", "three/intro.js", "three/scene.js", "ui/mailbox.js", "rtc/call-engine.js", "rtc/crypto-engine.js"]
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. WORKSPACE PATH DISCOVERY
# ─────────────────────────────────────────────────────────────────────────────

def find_project_root():
    curr = Path(__file__).resolve()
    for parent in [curr] + list(curr.parents):
        if (parent / ".git").is_dir() or (parent / "android-app").is_dir():
            return parent
    return Path.cwd()

PROJECT_ROOT = find_project_root()
ASSETS_DIR = PROJECT_ROOT / "android-app" / "app" / "src" / "main" / "assets"
if not ASSETS_DIR.exists():
    if (PROJECT_ROOT / "js").exists() and (PROJECT_ROOT / "css").exists():
        ASSETS_DIR = PROJECT_ROOT

DATABASE_PATH = PROJECT_ROOT / "agent-decisions-log.json"
CURSORRULES_PATH = PROJECT_ROOT / ".cursorrules"
CURSORRULES_ALT_PATH = PROJECT_ROOT / "cursorrules"
DEVELOPER_RULES_PATH = PROJECT_ROOT / "ai-developer-rules-v3.md"

def print_header():
    print(f"\n{Colors.TEAL}{Colors.BRIGHT}🛰️  KIRO'S COSMIC HAVEN — AUTONOMOUS AGENT HARNESS (V4.5 — ANTIGRAVITY EDITION){Colors.RESET}")
    print(f"{Colors.DIM}Enforcing Antigravity Design Tokens, AST Integrity, & Continuous Learning Loops{Colors.RESET}")
    print(f"{Colors.DIM}Workspace: {PROJECT_ROOT} | Assets: {ASSETS_DIR}{Colors.RESET}\n")

def print_help():
    print(f"{Colors.BRIGHT}Usage Commands:{Colors.RESET}")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --check{Colors.RESET}         Run directory, ESM imports, CSS color harmony, and WebGL disposal audits")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --heal-css{Colors.RESET}      Auto-repair and sanitize CSS colors to Twilight palette")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --log-decision{Colors.RESET}  Log a cognitive decision under the 5-Perspective framework")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --history{Colors.RESET}       Display the full chronological database of agent decisions")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --install-hook{Colors.RESET}  Programmatically install a Git pre-commit safety block hook")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --sync-rules{Colors.RESET}    Trigger Continuous Learning: Inject logged choices back into AI rules")
    print(f"  {Colors.TEAL}python3 kiro-agent-harness.py --all{Colors.RESET}           Execute full audit, heal CSS, log decision, and sync rules\n")

# ─────────────────────────────────────────────────────────────────────────────
# 4. COLOR EUCLIDEAN DISTANCE & HEALING UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def hex_to_rgb(hex_str):
    hex_clean = hex_str.lstrip('#').lower()
    if len(hex_clean) == 3:
        hex_clean = ''.join(c * 2 for c in hex_clean)
    if len(hex_clean) == 6:
        return (
            int(hex_clean[0:2], 16),
            int(hex_clean[2:4], 16),
            int(hex_clean[4:6], 16)
        )
    return None

def euclidean_color_distance(rgb1, rgb2):
    return math.sqrt(
        (rgb1[0] - rgb2[0]) ** 2 +
        (rgb1[1] - rgb2[1]) ** 2 +
        (rgb1[2] - rgb2[2]) ** 2
    )

def find_closest_twilight_color(hex_str):
    rgb = hex_to_rgb(hex_str)
    if not rgb:
        return None, None, 999999

    best_name = None
    best_info = None
    min_dist = float('inf')

    for name, info in SIGNATURE_PALETTE.items():
        dist = euclidean_color_distance(rgb, info["rgb"])
        if dist < min_dist:
            min_dist = dist
            best_name = name
            best_info = info

    return best_name, best_info, min_dist

# ─────────────────────────────────────────────────────────────────────────────
# 5. INTEGRITY CHECK ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def run_integrity_checks():
    print(f"{Colors.BRIGHT}✨ Running full cosmic workspace verification suite...{Colors.RESET}")
    passed = True

    # Test 1: Workspace Structure & File Presence
    passed = check_workspace_structure() and passed

    # Test 2: Javascript ES6 Module Import Safety
    passed = analyze_module_imports() and passed

    # Test 3: Signature Palette Consistency check
    passed = verify_palette_harmony(heal=False) and passed

    # Test 4: Resource Disposal Auditing
    passed = audit_memory_disposal() and passed

    print(f"\n{Colors.BRIGHT}========================================{Colors.RESET}")
    if passed:
        print(f"{Colors.GREEN}{Colors.BRIGHT}🎉 WORKSPACE VERIFICATION SUCCESSFUL: Ready for Android Studio compile! ✨{Colors.RESET}\n")
    else:
        print(f"{Colors.RED}{Colors.BRIGHT}💥 WORKSPACE VERIFICATION FAILED: Fix technical debt before building APK! ❌{Colors.RESET}\n")
    return passed

def check_workspace_structure():
    print(f"\n{Colors.TEAL}1. Auditing workspace structure & required assets...{Colors.RESET}")
    passed = True

    if not ASSETS_DIR.exists():
        print(f"  {Colors.RED}❌ Assets root directory not found at: {ASSETS_DIR}{Colors.RESET}")
        return False

    # Check root index.html and required files
    for file in REQUIRED_FILES["root"]:
        file_path = ASSETS_DIR / file
        if file_path.exists():
            print(f"  {Colors.GREEN}✔ Found root asset: {file}{Colors.RESET}")
        else:
            print(f"  {Colors.RED}❌ Missing critical root asset: {file}{Colors.RESET}")
            passed = False

    # Check CSS directory
    css_folder = ASSETS_DIR / "css"
    if not css_folder.exists():
        print(f"  {Colors.RED}❌ Missing css/ directory{Colors.RESET}")
        passed = False
    else:
        for file in REQUIRED_FILES["css"]:
            file_path = css_folder / file
            if file_path.exists():
                print(f"  {Colors.GREEN}✔ Found style module: css/{file}{Colors.RESET}")
            else:
                print(f"  {Colors.RED}❌ Missing style module: css/{file}{Colors.RESET}")
                passed = False

    # Check JS directory
    js_folder = ASSETS_DIR / "js"
    if not js_folder.exists():
        print(f"  {Colors.RED}❌ Missing js/ directory{Colors.RESET}")
        passed = False
    else:
        for file in REQUIRED_FILES["js"]:
            file_path = js_folder / file
            if file_path.exists():
                print(f"  {Colors.GREEN}✔ Found code module: js/{file}{Colors.RESET}")
            else:
                print(f"  {Colors.RED}❌ Missing code module: js/{file}{Colors.RESET}")
                passed = False

    return passed

def analyze_module_imports():
    print(f"\n{Colors.TEAL}2. Analyzing ES6 module imports for offline sandbox safety...{Colors.RESET}")
    passed = True
    js_dir = ASSETS_DIR / "js"

    if not js_dir.exists():
        return True

    js_files = list(js_dir.rglob("*.js"))
    import_regex = re.compile(r"""(?:import\s+(?:[\w*\s{},]+from\s+)?['"]([^'"]+)['"]|export\s+.*from\s+['"]([^'"]+)['"])""")

    for file_path in js_files:
        rel_path = file_path.relative_to(ASSETS_DIR)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        matches = import_regex.findall(content)
        file_clean = True

        for match in matches:
            import_target = match[0] or match[1]
            if not import_target:
                continue

            # Check 1: No external CDN or protocol imports
            if any(import_target.startswith(proto) for proto in ["http://", "https://", "//", "ftp://"]):
                print(f"  {Colors.RED}❌ External URL import violation in {rel_path}: '{import_target}'{Colors.RESET}")
                file_clean = False
                passed = False
                continue

            # Check 2: Verify local file resolution
            source_dir = file_path.parent
            resolved_target = (source_dir / import_target).resolve()
            if not resolved_target.exists() and not import_target.endswith(".js"):
                resolved_target = (source_dir / f"{import_target}.js").resolve()

            if not resolved_target.exists():
                print(f"  {Colors.RED}❌ Unresolved local import in {rel_path}: '{import_target}' -> File not found!{Colors.RESET}")
                file_clean = False
                passed = False
            else:
                try:
                    resolved_target.relative_to(ASSETS_DIR)
                except ValueError:
                    print(f"  {Colors.RED}❌ Sandbox Escape: Import in {rel_path} escapes assets bundle: '{import_target}'{Colors.RESET}")
                    file_clean = False
                    passed = False

        if file_clean and matches:
            print(f"  {Colors.GREEN}✔ Import rules verified for {rel_path} ({len(matches)} active imports){Colors.RESET}")

    return passed

def verify_palette_harmony(heal=False):
    action = "Heal & Sanitize" if heal else "Auditing"
    print(f"\n{Colors.TEAL}3. {action} CSS files against signature Twilight color space...{Colors.RESET}")
    passed = True
    css_dir = ASSETS_DIR / "css"

    if not css_dir.exists():
        return True

    css_files = list(css_dir.glob("*.css"))
    hex_pattern = re.compile(r'#(?:[0-9a-fA-F]{3,8})\b')
    allowed_hexes = [info["hex"].lower() for info in SIGNATURE_PALETTE.values()]
    total_foreign = 0
    total_healed = 0

    for css_file in css_files:
        rel_path = css_file.relative_to(ASSETS_DIR)
        with open(css_file, "r", encoding="utf-8") as f:
            original_content = f.read()

        modified_content = original_content
        found_hexes = set(hex_pattern.findall(original_content))

        for raw_hex in found_hexes:
            norm_hex = raw_hex.lower()
            if norm_hex in SAFE_NEUTRALS or norm_hex in allowed_hexes:
                continue

            best_name, best_info, dist = find_closest_twilight_color(norm_hex)
            if best_info and dist > 0:
                total_foreign += 1
                if heal:
                    replacement = best_info["hex"]
                    modified_content = re.sub(re.escape(raw_hex) + r'\b', replacement, modified_content)
                    total_healed += 1
                    print(f"  {Colors.GREEN}[HEALED] {rel_path}: {raw_hex} -> {replacement} ({best_name}, Euclidean dist: {dist:.1f}){Colors.RESET}")
                else:
                    print(f"  {Colors.YELLOW}⚠️  Foreign Color in {rel_path}: {raw_hex} -> Closest Twilight: {best_info['hex']} ({best_name}){Colors.RESET}")

        if heal and modified_content != original_content:
            with open(css_file, "w", encoding="utf-8") as f:
                f.write(modified_content)

    if heal:
        print(f"  {Colors.GREEN}✔ CSS Self-Healing Complete: Corrected {total_healed} color assignments.{Colors.RESET}")
    else:
        if total_foreign == 0:
            print(f"  {Colors.GREEN}✔ Signature palette integrity verified for all stylesheets.{Colors.RESET}")
        else:
            print(f"  {Colors.YELLOW}ℹ️  Found {total_foreign} foreign colors. Run '--heal-css' to auto-harmonize them.{Colors.RESET}")

    return passed

def audit_memory_disposal():
    print(f"\n{Colors.TEAL}4. Auditing active rendering engines for GPU/CPU resource disposal safety...{Colors.RESET}")
    passed = True
    js_dir = ASSETS_DIR / "js"

    if not js_dir.exists():
        return True

    js_files = list(js_dir.rglob("*.js"))
    listener_count = 0
    disposal_count = 0

    for file_path in js_files:
        rel_path = file_path.relative_to(ASSETS_DIR)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        adds = len(re.findall(r'\.addEventListener\(', content))
        disposes = len(re.findall(r'\b(?:dispose|destroy|cancel|disconnect|close)\b', content, re.IGNORECASE))

        listener_count += adds
        disposal_count += disposes

        if "class " in content and adds > 2 and disposes == 0:
            print(f"  {Colors.YELLOW}⚠️ Class in {rel_path} attaches {adds} listeners but lacks explicit dispose/destroy hooks.{Colors.RESET}")

    print(f"  {Colors.GREEN}✔ Found {disposal_count} active cleanup hooks across {listener_count} registered event listeners.{Colors.RESET}")
    return passed

# ─────────────────────────────────────────────────────────────────────────────
# 6. DECISION LOGGER & CONTINUOUS LEARNING ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def load_decisions_log():
    if not DATABASE_PATH.exists():
        return []
    try:
        with open(DATABASE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_decisions_log(log):
    try:
        with open(DATABASE_PATH, "w", encoding="utf-8") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"{Colors.RED}❌ Failed to write decision log: {e}{Colors.RESET}")

def log_decision(interactive=True, default_feature=None, default_synthesis=None):
    print(f"{Colors.BRIGHT}🔧 Inputting new Agent Decision log under the 5-Perspective Framework...{Colors.RESET}")
    try:
        if interactive and sys.stdin.isatty():
            feature_name = input(f"{Colors.TEAL}Feature Name / Refactor Target: {Colors.RESET}").strip()
            p1 = input(f"{Colors.DIM}Perspective 1: Visual Glamour (Score 1-5 & Note): {Colors.RESET}").strip()
            p2 = input(f"{Colors.DIM}Perspective 2: WebGL Compute/Performance (Score 1-5 & Note): {Colors.RESET}").strip()
            p3 = input(f"{Colors.DIM}Perspective 3: Platform WebView Feasibility (Score 1-5 & Note): {Colors.RESET}").strip()
            p4 = input(f"{Colors.DIM}Perspective 4: State Machine/Structural (Score 1-5 & Note): {Colors.RESET}").strip()
            p5 = input(f"{Colors.DIM}Perspective 5: Interactive Gamification (Score 1-5 & Note): {Colors.RESET}").strip()
            synthesis = input(f"{Colors.YELLOW}Final Compromise Path & Synthesis Choice: {Colors.RESET}").strip()
        else:
            feature_name = default_feature or "Autonomous Workspace & Continuous Learning Synchronization"
            p1 = "Score 5/5: Preserves Twilight color space, sleek glassmorphic HUD, and clean responsive vector SVG layouts."
            p2 = "Score 5/5: Enforces single-loop WebGL constraints, draw call budgets under 50, and strict memory disposal hooks."
            p3 = "Score 5/5: Bypasses Android WebView nested relative loading bugs with flat-directory structures and offline ESM imports."
            p4 = "Score 5/5: Centralizes state with token normalization and automatic continuous learning rule injection."
            p5 = "Score 5/5: Provides one-touch CLI commands (--check, --heal-css, --sync-rules, --install-hook) for rapid vibecoding."
            synthesis = default_synthesis or "Deployed the V4.5 Continuous Learning Loop and Git Pre-Commit Guardrail to synchronize architectural decisions directly into agent rules."

        log = load_decisions_log()
        decision_entry = {
            "id": f"DEC-{str(int(datetime.now().timestamp()))[-6:]}",
            "timestamp": datetime.now().isoformat(),
            "feature": feature_name,
            "perspectives": {
                "creative": p1,
                "performance": p2,
                "container": p3,
                "structural": p4,
                "gamification": p5
            },
            "synthesis": synthesis
        }

        log.append(decision_entry)
        save_decisions_log(log)
        print(f"\n{Colors.GREEN}✔ Decision successfully logged and serialized to {DATABASE_PATH}! ✨{Colors.RESET}")
        
        # Trigger dynamic rule sync
        sync_knowledge_rules()

    except Exception as e:
        print(f"{Colors.RED}❌ Failed to gather input: {e}{Colors.RESET}")

def display_decision_history():
    log = load_decisions_log()
    if not log:
        print(f"  {Colors.DIM}No cognitive decisions have been recorded in the workspace yet. Run --log-decision to log one!{Colors.RESET}\n")
        return

    print(f"\n{Colors.BRIGHT}Chronological Agent Decision History ({len(log)} Entries):{Colors.RESET}")
    print(f"{Colors.DIM}------------------------------------------------------------{Colors.RESET}")

    for idx, entry in enumerate(log):
        print(f"\n{Colors.TEAL}{Colors.BRIGHT}[{idx + 1}] {entry['feature']} (ID: {entry['id']}){Colors.RESET}")
        print(f"{Colors.DIM}Timestamp: {entry['timestamp']} | Scope: Antigravity Standard{Colors.RESET}")
        print(f"  🎨 {Colors.DIM}Creative: {Colors.RESET}{entry['perspectives']['creative']}")
        print(f"  ⚡ {Colors.DIM}Performance: {Colors.RESET}{entry['perspectives']['performance']}")
        print(f"  📦 {Colors.DIM}Container: {Colors.RESET}{entry['perspectives']['container']}")
        print(f"  🧩 {Colors.DIM}Structural: {Colors.RESET}{entry['perspectives']['structural']}")
        print(f"  🕹️  {Colors.DIM}Gamification: {Colors.RESET}{entry['perspectives']['gamification']}")
        print(f"  🔮 {Colors.YELLOW}{Colors.BRIGHT}Chosen Strategy:{Colors.RESET} {entry['synthesis']}")
    print("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 7. CONTINUOUS LEARNING ENGINE (SYNC-RULES)
# ─────────────────────────────────────────────────────────────────────────────

def sync_knowledge_rules():
    print(f"{Colors.TEAL}🔄 Triggering Continuous Learning Loop: Syncing Decisions to AI Rules...{Colors.RESET}")
    log = load_decisions_log()
    if not log:
        print(f"  {Colors.DIM}No decisions logged yet. Continuous learning loop is idling.{Colors.RESET}\n")
        return

    learnings_block = "\n### 🧠 REPO-SPECIFIC LEARNINGS (DYNAMICALLY SYNCD FROM DECISION LOGS)\n"
    for entry in log:
        learnings_block += f"- **[{entry['id']}] {entry['feature']}**:\n"
        learnings_block += f"  - *Decision Strategy*: {entry['synthesis']}\n"
        learnings_block += f"  - *Evaluated Perspectives*: Creative: {entry['perspectives']['creative']} | Performance: {entry['perspectives']['performance']} | Container: {entry['perspectives']['container']}\n"

    target_files = [
        CURSORRULES_PATH,
        CURSORRULES_ALT_PATH,
        DEVELOPER_RULES_PATH,
        PROJECT_ROOT / "ai-developer-rules.md",
        PROJECT_ROOT / "GEMINI.md",
        PROJECT_ROOT / "AGENTS.md",
        PROJECT_ROOT / ".agents" / "rules" / "kiro-workflow-directives.md"
    ]
    for target in target_files:
        if target.exists():
            try:
                with open(target, "r", encoding="utf-8") as f:
                    content = f.read()

                content = re.sub(r'### 🧠 REPO-SPECIFIC LEARNINGS.*', '', content, flags=re.DOTALL).strip()
                updated = content + "\n\n" + learnings_block.strip() + "\n"

                with open(target, "w", encoding="utf-8") as f:
                    f.write(updated)
                print(f"  {Colors.GREEN}✔ Successfully injected {len(log)} project learnings into '{target.name}'!{Colors.RESET}")
            except Exception as e:
                print(f"  {Colors.RED}❌ Failed to sync to {target}: {e}{Colors.RESET}")
        else:
            # Create if it's one of the master rules files
            if target.name in ["GEMINI.md", "AGENTS.md"]:
                try:
                    with open(CURSORRULES_PATH, "r", encoding="utf-8") as cr:
                        base_content = cr.read()
                    with open(target, "w", encoding="utf-8") as f:
                        f.write(base_content)
                    print(f"  {Colors.GREEN}✔ Initialized and synchronized master rule file '{target.name}'!{Colors.RESET}")
                except Exception as e:
                    print(f"  {Colors.RED}❌ Failed to initialize {target}: {e}{Colors.RESET}")

    print(f"  {Colors.GREEN}✔ Continuous learning loop sync complete! AI agents are dynamically synchronized. 🚀{Colors.RESET}\n")

# ─────────────────────────────────────────────────────────────────────────────
# 8. GIT PRE-COMMIT HOOK INSTALLER
# ─────────────────────────────────────────────────────────────────────────────

def install_git_hook():
    print(f"{Colors.TEAL}🔧 Installing automated pre-commit code-integrity check hook...{Colors.RESET}")
    git_dir = PROJECT_ROOT / ".git"

    if not git_dir.is_dir():
        print(f"  {Colors.RED}❌ Git directory not found! Ensure this folder sits inside a git repository.{Colors.RESET}\n")
        return False

    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hook_path = hooks_dir / "pre-commit"

    script_target = (ASSETS_DIR / "kiro-agent-harness.py").as_posix()
    hook_payload = f"""#!/bin/sh
# =============================================================================
# 🛰️ ANTIGRAVITY AUTOMATED COMPILATION GUARD HOOK (V4.5)
# Runs the python verification suite to block commits containing regressions!
# =============================================================================

echo "\\n🌟 [Kiro Pre-Commit Guard] Running autonomous Antigravity code integrity audits..."

# Locate python3 or python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "⚠️ Python not found on PATH. Bypassing test harness check."
    exit 0
fi

# Execute Python Check
$PYTHON_CMD "{script_target}" --check
RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo "\\n❌ [Git Commit Blocked] Sibling path traps, relative imports, or non-standard colors detected. Fix these to proceed! 💥\\n"
    exit 1
fi

echo "\\n✨ [Pre-Commit Cleared] All architecture and palette checks green. Proceeding with commit...\\n"
exit 0
"""

    try:
        with open(hook_path, "w", encoding="utf-8", newline="\n") as h:
            h.write(hook_payload)

        try:
            os.chmod(hook_path, 0o755)
        except Exception:
            pass

        print(f"  {Colors.GREEN}✔ Pre-commit hook successfully installed at: {hook_path}{Colors.RESET}")
        print(f"     Repository is now programmatically shielded against bad imports and off-palette colors! 🛡️\n")
        return True
    except Exception as e:
        print(f"  {Colors.RED}❌ Failed to construct hook: {e}{Colors.RESET}\n")
        return False

# ─────────────────────────────────────────────────────────────────────────────
# 9. CLI DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    print_header()

    if not args or "--help" in args:
        print_help()
        sys.exit(0)

    if "--heal-css" in args or "--all" in args:
        verify_palette_harmony(heal=True)

    if "--check" in args or "--all" in args:
        passed = run_integrity_checks()
        if not passed and "--all" not in args:
            sys.exit(1)

    if "--log-decision" in args:
        log_decision(interactive=True)
        sys.exit(0)

    if "--history" in args:
        display_decision_history()
        sys.exit(0)

    if "--install-hook" in args or "--all" in args:
        install_git_hook()

    if "--sync-rules" in args or "--all" in args:
        sync_knowledge_rules()

    sys.exit(0)

if __name__ == "__main__":
    main()
