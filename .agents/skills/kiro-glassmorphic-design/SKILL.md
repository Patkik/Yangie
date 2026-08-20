---
name: kiro-glassmorphic-design
description: Space Capsule glassmorphic UI design tokens, frosted layout panels, capsule status tracks, responsive inline-SVGs, and conversational messenger styling.
---

# Skill 3: Cozy Glassmorphic UI & Inline-SVG Design

**Target Tech Stack**: CSS3 (Transitions & Flexbox/Grid), Inline Vector SVGs, HTML5  
**Scope**: Designing Kiro's Space Capsule dashboard tabs, character-selection screens, and the Messenger-style mailbox.

## 1. Engineering Directives

### A. Thematic Palette Coordination
All visual layers must explicitly reference Kiro's signature color tokens:
- **`#4EC9B0`**: Cozy Mint-Teal (Patrick's focus color, Kiro's body glow, active state toggles).
- **`#FFB6C1` / `#F5B7C0`**: Soft Pastel Pink (Yangiee's focus color, Kiro's nose/blush, candy highlights).
- **`#CBA6F7`**: Starlight Lavender-Purple (Kiro's nightcap, secondary cards, cosmic depth).
- **`#F0EDE8`**: Creamy off-white (Typography headers and front belly accents).
- **`#1A3A3A`**: Deep obsidian (Eyes and high-contrast labels).
- **`rgba(30, 30, 46, 0.75)`**: Translucent Midnight Blue (Glassmorphism card backgrounds).

### B. Hardware-Composited CSS Transitions
- To ensure smooth **120Hz transitions** on high-end Android displays, only animate CSS properties that bypass layout and painting stages—specifically **`transform`** and **`opacity`**.
- Avoid animating `width`, `height`, `margin`, `top`, `left`, or `filter` on interactive UI elements during transitions.

### C. Strict Vector Rendering (No Raw Emojis)
- The agent is **forbidden from using raw system emojis** for micro-interactions, HUD navigation, reactions, and buttons.
- All buttons, avatars, quick reactions, and custom badges must use **inline vector SVGs** to ensure razor-sharp rendering across all Retina, OLED, and ultra-high-DPI mobile screens without platform font variation.

### D. Accessibility & Reduced Motion
- Wrap all non-essential UI keyframe loops and spinning star animations inside `@media (prefers-reduced-motion: reduce)` rules to respect user system preferences.
- Maintain high WCAG AA text contrast against frosted glassmorphic backdrops using semi-transparent dark underlays and soft text glows.
