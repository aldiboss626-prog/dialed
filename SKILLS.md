# Dialed — Installed Claude Skills

*15 skills, all project-level in `.claude/skills/`. Last updated: 2026-06-17.*

Most of these are **web / design-image** skills — useful for the **marketing website and brand assets** (the business-side work being started). For the actual React Native app, the directly applicable ones are **`emil-design-eng`** and **`imagegen-frontend-mobile`**.

| # | Skill | What it does |
| --- | --- | --- |
| 1 | **emil-design-eng** | Emil Kowalski's UI-craft philosophy: polish, component design, animation decisions, and the invisible details that make software feel great. *(Most relevant to the RN app.)* |
| 2 | **impeccable** | UI review / redesign + anti-pattern auditing: visual hierarchy, accessibility, spacing, color, motion, UX copy, design systems. *(Web CSS/HTML oriented.)* |
| 3 | **design-taste-frontend** | Anti-"slop" frontend skill for landing pages, portfolios, and redesigns; infers a design direction, audit-first. |
| 4 | **design-taste-frontend-v1** | The original v1 of the above, kept for backward compatibility. |
| 5 | **high-end-visual-design** | Design like a high-end agency: exact fonts, spacing, shadows, card structures, animations; blocks "cheap" AI defaults. |
| 6 | **minimalist-ui** | Clean editorial interfaces: warm monochrome, typographic contrast, flat bento grids, no gradients/heavy shadows. |
| 7 | **industrial-brutalist-ui** | Raw mechanical / Swiss-print + terminal aesthetic for data-heavy dashboards and editorial sites. |
| 8 | **gpt-taste** | Elite UX/UI + advanced GSAP motion; strict AIDA page structure, editorial typography, bento grids, scroll effects. |
| 9 | **redesign-existing-projects** | Upgrades existing sites/apps to premium quality without breaking functionality; audits and removes generic patterns. |
| 10 | **brandkit** | Premium brand-kit **image** generation: brand boards, logo systems, identity decks, mockups. |
| 11 | **image-to-code** | Generates a design image first, analyzes it, then builds the website to match (Codex-oriented). |
| 12 | **imagegen-frontend-mobile** | Generates premium mobile-app screen concepts inside phone mockups. Image generation only. *(Relevant to the app.)* |
| 13 | **imagegen-frontend-web** | Generates one premium reference image per website section for landing/marketing comps. |
| 14 | **stitch-design-taste** | Produces `DESIGN.md` design-system files for Google Stitch with anti-generic UI standards. |
| 15 | **full-output-enforcement** | Forces complete, unabridged code output; bans placeholder truncation. *(General-purpose, not design.)* |

---

*Source: 14 added via `npx skills add Leonxlnx/taste-skill`, plus the pre-existing `emil-design-eng`. Skills load at startup, so newly added ones become active on the next session.*
