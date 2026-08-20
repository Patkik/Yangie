---
name: kiro-glassmorphic-design
description: Space Capsule glassmorphic UI design tokens, frosted layout panels, capsule status tracks, responsive inline-SVGs, and conversational messenger styling.
---

# Cozy Glassmorphic UI & Layout Design

Use this skill when designing, styling, or refactoring UI components in Kiro's Space Capsule dashboard.

## 1. Palette & Design Tokens
- Mint-teal (`#4EC9B0`, glow: `rgba(78, 201, 176, 0.45)`)
- Pastel pink (`#F5B7C0`, glow: `rgba(245, 183, 192, 0.4)`)
- Lavender (`#CBA6F7`, glow: `rgba(203, 166, 247, 0.35)`)
- Cream (`#F0EDE8`)
- Obsidian (`#1A3A3A`)
- Twilight Background (`#0D1622` to `#1B2C42`)

## 2. Glassmorphism Components
- **Frosted Panels**: `background: rgba(19, 31, 48, 0.72); backdrop-filter: blur(14px); border: 1px solid rgba(148, 226, 213, 0.22); border-radius: 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.45);`.
- **Capsule Status Bars**: Rounded tracks (`border-radius: 8px`) with gradient glowing fills and inner shadows (`box-shadow: inset 0 2px 4px rgba(0,0,0,0.35)`).
- **Tactile Action Buttons**: Rounded pill shape with hover lift (`translateY(-2px)`) and glowing elevation.

## 3. High-Performance Inline-SVGs
- Use crisp vector SVGs for avatars (Patrick astronaut helmet, Yangiee cozy cat) and reaction badges (`star`, `heart`, `moon`, `planet`, `rocket`) rather than emojis to ensure pixel-perfect rendering across all device densities and dark backgrounds.
