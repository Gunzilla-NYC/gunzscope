# GUNZscope Brand System v2.0

> Rebrand from "Zillascope" → "GUNZscope". This document defines the complete visual identity.
> Claude Code: treat this as the authoritative source for all styling decisions.

---

## Design Philosophy

**"Tactical Intelligence"** — a weapon HUD meets Bloomberg terminal. The aesthetic is cyberpunk-military-data,
drawing from Gunzilla's aggressive neon lime, LayerZero's clean data architecture with soft purple accents,
and Arkham Intelligence's dashboard density.

**Signature shape language**: Angled corner cuts (CSS `clip-path`) inspired by the game's HEX loot boxes.
Applied to buttons, badges, cards, and containers at 6–12px cuts.

```css
/* Standard corner cut — use on buttons, badges, small containers */
clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));

/* Large corner cut — use on hero CTAs, large containers */
clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));

/* Small corner cut — use on inline badges, small pills */
clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
```

---

## Color System

### CSS Variables (Tailwind + Raw CSS)

```css
:root {
  /* ── Primary ── */
  --gs-lime: #A6F700;
  --gs-lime-dim: #7FB800;
  --gs-lime-glow: rgba(166, 247, 0, 0.15);
  --gs-lime-glow-strong: rgba(166, 247, 0, 0.3);

  /* ── Secondary (Indigo Tactical) ── */
  --gs-purple: #6D5BFF;
  --gs-purple-bright: #8577FF;
  --gs-purple-dim: #5648CC;
  --gs-purple-glow: rgba(109, 91, 255, 0.1);
  --gs-purple-glow-strong: rgba(109, 91, 255, 0.25);

  /* ── Neutrals ── */
  --gs-black: #0A0A0A;
  --gs-black-pure: #000000;
  --gs-dark-1: #111111;
  --gs-dark-2: #161616;
  --gs-dark-3: #1C1C1C;
  --gs-dark-4: #242424;
  --gs-gray-1: #333333;
  --gs-gray-2: #555555;
  --gs-gray-3: #888888;
  --gs-gray-4: #AAAAAA;
  --gs-white: #F0F0F0;
  --gs-white-dim: #CCCCCC;

  /* ── Status ── */
  --gs-profit: #00FF88;
  --gs-loss: #FF4444;
  --gs-warning: #FFAA00;

  /* ── Rarity ── */
  --gs-rarity-common: #8A8A8A;
  --gs-rarity-uncommon: #4A9EAD;
  --gs-rarity-rare: #4A7AFF;
  --gs-rarity-epic: #B44AFF;
  --gs-rarity-legendary: #FF8C00;
  --gs-rarity-mythic: #FF4466;
  --gs-rarity-classified: #E74C3C;
}
```

### Tailwind Config Extension

```js
// tailwind.config.ts — extend theme.colors
colors: {
  gs: {
    lime: '#A6F700',
    'lime-dim': '#7FB800',
    purple: '#6D5BFF',
    'purple-bright': '#8577FF',
    'purple-dim': '#5648CC',
    black: '#0A0A0A',
    'dark-1': '#111111',
    'dark-2': '#161616',
    'dark-3': '#1C1C1C',
    'dark-4': '#242424',
    'gray-1': '#333333',
    'gray-2': '#555555',
    'gray-3': '#888888',
    'gray-4': '#AAAAAA',
    white: '#F0F0F0',
    'white-dim': '#CCCCCC',
    profit: '#00FF88',
    loss: '#FF4444',
    warning: '#FFAA00',
  }
}
```

### Color Usage Rules

| Role | Color | When to use |
|------|-------|-------------|
| **Primary action** | `--gs-lime` | CTAs, primary buttons, active nav items, positive emphasis |
| **Primary hover** | `#B8FF33` | Hover state for lime elements |
| **Secondary accent** | `--gs-purple` | Section structure, labels, secondary data, logo "scope" text |
| **Secondary bright** | `--gs-purple-bright` | Hero emphasis text, highlighted keywords, stat accents |
| **Profit / positive** | `--gs-profit` | P&L gains, positive percentages, success states |
| **Loss / negative** | `--gs-loss` | P&L losses, negative percentages, error states, danger buttons |
| **Warning** | `--gs-warning` | Pending states, caution indicators |
| **Body text** | `--gs-gray-4` | Paragraph text, descriptions |
| **Labels** | `--gs-gray-3` | Stat labels, metadata, timestamps |
| **Muted** | `--gs-gray-2` | Disabled states, tertiary info |
| **Borders** | `rgba(255,255,255,0.06)` | Card borders, dividers |
| **Accent borders** | `rgba(203,255,0,0.2)` | Active/highlighted card borders |

### Gradient Patterns

```css
/* Hero title underline */
background: linear-gradient(90deg, var(--gs-lime), var(--gs-purple), transparent);

/* Card top accent line */
background: linear-gradient(90deg, var(--gs-lime-dim), var(--gs-purple-dim), transparent);

/* Feature hover bottom bar */
background: linear-gradient(90deg, var(--gs-lime), var(--gs-purple));

/* Loading bar fill */
background: linear-gradient(90deg, var(--gs-lime), var(--gs-purple));

/* Preview frame border */
border-image: linear-gradient(135deg, rgba(203,255,0,0.12), rgba(167,139,250,0.12)) 1;

/* Typography display gradient */
background: linear-gradient(135deg, var(--gs-lime), var(--gs-purple-bright));
-webkit-background-clip: text;
```

---

## Typography

### Font Stack

| Role | Font | Weight | Import |
|------|------|--------|--------|
| **Display** | Chakra Petch | 600, 700 | `family=Chakra+Petch:wght@400;500;600;700` |
| **Body** | Outfit | 300, 400, 500 | `family=Outfit:wght@300;400;500;600;700` |
| **Monospace** | JetBrains Mono | 400, 500, 600 | `family=JetBrains+Mono:wght@400;500;600` |

```css
--font-display: 'Chakra Petch', sans-serif;
--font-body: 'Outfit', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Typography Rules

| Element | Font | Size | Weight | Transform | Tracking | Color |
|---------|------|------|--------|-----------|----------|-------|
| Page title | display | clamp(48px, 7vw, 88px) | 700 | uppercase | -1px | white / purple / lime |
| Section title | display | 32px | 700 | uppercase | 1px | white |
| Card title | display | 16px | 600 | uppercase | 1px | white |
| NFT name | display | 12–14px | 600 | uppercase | 0.5px | white |
| Body text | body | 16–18px | 300 | none | normal | gray-4 |
| Description | body | 14px | 300 | none | normal | gray-3 |
| Labels | mono | 9–10px | 400 | uppercase | 1.5–2px | gray-3 |
| Data values | display | 18–36px | 700 | none | normal | varies by context |
| Addresses/hashes | mono | 11–13px | 400 | none | 0.5px | lime or purple |
| Badge text | mono | 8–9px | 400 | uppercase | 1px | rarity/status color |

---

## Component Patterns

### Buttons

```
Primary:    bg lime, text black, clip-path 10px, hover: #B8FF33 + translateY(-1px) + box-shadow
Secondary:  bg transparent, border gray-1, text white-dim, clip-path 10px, hover: border lime + text lime
Ghost:      bg transparent, border gray-1, text gray-3, no clip-path, hover: border gray-3 + text white
Danger:     bg loss/10%, border loss/30%, text loss, clip-path 8px, hover: bg loss/20%
```

### Cards

```
Standard:   bg dark-2, border subtle, relative, overflow hidden
            ::before top accent line — gradient lime-dim → purple-dim → transparent (opacity 0.4)
NFT Card:   bg dark-3, border subtle, hover: border lime/30% + translateY(-2px)
Stat Card:  bg dark-3, border subtle, border-left 2px gray-1, hover: border-left lime
Glass:      bg rgba(22,22,22,0.8), backdrop-filter blur(20px), border subtle
```

### Badges

```
Rarity:     bg {color}/15%, border 1px {color}/20%, text {color}, mono 8-9px uppercase
Status:     same as rarity + ::before dot (5px circle in status color)
Chain:      lime for GunzChain, #9945FF for Solana
Type:       purple for Weapon, #FF8C00 for Skin
Classified: red bg, text, border + 🔒 prefix
```

### Rarity Badge Colors

| Rarity | Background | Text | Border |
|--------|-----------|------|--------|
| Common | `rgba(138,138,138,0.15)` | `#8A8A8A` | `rgba(138,138,138,0.2)` |
| Uncommon | `rgba(74,158,173,0.15)` | `#4A9EAD` | `rgba(74,158,173,0.2)` |
| Rare | `rgba(74,122,255,0.15)` | `#4A7AFF` | `rgba(74,122,255,0.2)` |
| Epic | `rgba(180,74,255,0.15)` | `#B44AFF` | `rgba(180,74,255,0.2)` |
| Legendary | `rgba(255,140,0,0.15)` | `#FF8C00` | `rgba(255,140,0,0.2)` |
| Mythic | `rgba(255,68,102,0.15)` | `#FF4466` | `rgba(255,68,102,0.2)` |
| Classified | `rgba(231,76,60,0.15)` | `#E74C3C` | `rgba(231,76,60,0.2)` |

### Loading States

```
Bar:        3px height, dark-4 bg, fill gradient lime→purple, pulse animation
Spinner:    32px, 2px border gray-1, border-top lime, rotate animation
Dots:       3x 6px circles in lime, staggered bounce animation (0s, 0.2s, 0.4s)
```

---

## Logo

**Text mark**: "GUNZ" in white (font-display 700) + "scope" in purple (font-display 700)

**Icon mark**: 28×28px square with 4px border-radius, 2px lime border, containing a
right-pointing triangle (8px, lime fill) — represents a targeting reticle / scope.

**Wordmark tracking**: 2px letter-spacing, all uppercase

---

## Layout & Spacing

### Spacing Scale

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;
--space-2xl: 64px;
--space-3xl: 96px;
```

### Layout Patterns

- **Section padding**: `96px` vertical, `40px` horizontal
- **Card padding**: `40px` (brand cards), `24px` (NFT cards), `16px` (stat cards)
- **Grid gaps**: `1px` with bg separator (feature grids), `16px` (NFT grids), `40px` (brand grids)
- **Border style**: `1px solid rgba(255,255,255,0.06)` — standard. `1px solid rgba(203,255,0,0.2)` — accent.
- **Nav height**: `64px` fixed, blur backdrop

### Background Effects

- **Grid pattern**: Dual-layer — lime 60px grid at 2.5% opacity + purple 90px grid at 1.5% opacity
- **Scanlines**: 4px repeating gradient, 3% opacity
- **Radial glows**: lime glow (900px, 6% opacity center) + purple glow (600px, 5% opacity offset)
- **Crosshair decorations**: 24px, 15% opacity, lime primary + purple secondary

---

## Animation

### Principles

- Entrance: `fadeInUp` (20px translate, 0.8s ease) with staggered delays (0.1s increments)
- Scroll reveal: IntersectionObserver at 0.1 threshold, `translateY(30px)` → `0`, 0.6s cubic-bezier(0.16, 1, 0.3, 1)
- Hover: `translateY(-1px)` or `(-2px)` + border color transition, 0.3s ease
- Loading: pulse (width oscillation), spin (linear rotate), bounce (opacity + scale)

### Transition Defaults

```css
transition: all 0.3s ease;        /* general hover */
transition: all 0.4s ease;        /* card hover with ::after reveal */
transition: color 0.2s;           /* text color changes */
transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);  /* scroll reveal */
```

---

## Migration Checklist (Old → New)

| Old (Zillascope) | New (GUNZscope) |
|-------------------|-----------------|
| `#64ffff` (cyan primary) | `#A6F700` (lime primary) |
| `#96aaff` (purple secondary) | `#6D5BFF` (purple secondary — similar but adjusted) |
| `#beffd2` (green accent) | `#00FF88` (profit green — dedicated to P&L only) |
| `#181818` (dark bg) | `#0A0A0A` (darker black) + `#161616` (surface) |
| `glass-effect` class | Keep but update: `bg-[rgba(22,22,22,0.8)]` + `backdrop-blur-xl` + `border-white/[0.06]` |
| Inter/system fonts | Chakra Petch (display) + Outfit (body) + JetBrains Mono (data) |
| Rounded corners everywhere | Corner-cut clip-path on interactive elements, subtle radius on containers |
| Generic card borders | Top accent gradient lines (lime → purple → transparent) |
| Simple hover states | Hover with bottom gradient bar reveal + translateY |

---

## File-Specific Migration Notes

### `tailwind.config.ts`
- Add full `gs` color palette to `theme.extend.colors`
- Add font families to `theme.extend.fontFamily`
- Add custom `clip-path` utilities or use arbitrary values

### `globals.css` / `app/layout.tsx`
- Import Google Fonts (Chakra Petch, Outfit, JetBrains Mono)
- Set CSS custom properties in `:root`
- Add grid background, scanlines as global pseudo-elements or layout wrapper
- Set `body` background to `--gs-black`, default text to `--gs-white`

### `components/NFTGallery.tsx`
- NFT cards: update to new card pattern with top accent line
- Rarity badges: use new badge component with correct colors
- Hover states: add bottom gradient bar + translateY

### `components/NFTDetailModal.tsx`
- Typography: display font for titles, mono for data
- YOUR POSITION card: stat card pattern with left border accent
- Rarity & tier badges: new badge system

### `app/page.tsx` (main dashboard)
- Portfolio stats: new stat cell pattern with mono labels
- GUN price display: purple accent
- P&L display: profit/loss colors (not brand colors)
- Section headers: numbered + title + gradient line pattern

---

## Implementation Status

**Last Updated:** 2026-02-02

### Phase 1: Global Theme Foundation ✅ COMPLETE
- [x] CSS variables defined in `globals.css` (colors, spacing, typography)
- [x] Tailwind v4 `@theme inline` configured with `--color-gs-*` tokens
- [x] Google Fonts loaded via `next/font` (Chakra Petch, Outfit, JetBrains Mono)
- [x] Clip-path utilities created (`.clip-corner-sm`, `.clip-corner`, `.clip-corner-lg`)
- [x] Gradient utilities created (`.gradient-accent-line`, `.gradient-action`, etc.)
- [x] Glass effect updated for new brand

### Phase 2: Layout Shell ✅ COMPLETE
- [x] Background grid effects (`bg-gunzscope`, `bg-tactical-grid`)
- [x] Layout wrapper with grid overlay
- [x] Logo component rebranded (GUNZ white + scope purple wordmark)
- [x] Navbar updated with new colors and logo

### Phase 3: Shared Components ✅ COMPLETE
- [x] `Button` component with variants (primary, secondary, ghost, danger)
- [x] `RarityBadge` component (all 7 rarities)
- [x] `ChainBadge` component (GunzChain, Solana)
- [x] `StatCard` component (left border accent)
- [x] `Card` component (top gradient accent line)
- [x] Loading components (`LoadingBar`, `LoadingSpinner`, `LoadingDots`)
- [x] `useScrollReveal` hook

### Phase 4: Page Components 🔄 PARTIAL
- [x] NFTGallery cards updated (colors, typography, hover states)
- [ ] NFTDetailModal - needs typography and layout updates
- [ ] PortfolioHeader - needs stat card pattern
- [x] GunCard updated (colors, typography, accent line)
- [x] WaffleChart colors updated (lime/purple)
- [ ] Main page dashboard stats - needs section headers

### Phase 5: Polish ✅ COMPLETE
- [x] Entrance animations (fadeInUp, fadeIn)
- [x] Scroll reveal hook
- [x] Hover transitions (lift, glow)
- [x] PnLLoadingIndicator colors updated
- [x] Reduced motion support

### Files Created
- `components/ui/Button.tsx`
- `components/ui/RarityBadge.tsx`
- `components/ui/ChainBadge.tsx`
- `components/ui/StatCard.tsx`
- `components/ui/Card.tsx`
- `components/ui/LoadingBar.tsx`
- `components/ui/LoadingSpinner.tsx`
- `components/ui/LoadingDots.tsx`
- `hooks/useScrollReveal.ts`
- `docs/plans/2026-02-02-gunzscope-rebrand.md`

### Files Modified
- `app/globals.css` - CSS variables, utilities, animations
- `app/layout.tsx` - fonts, background wrapper
- `components/Logo.tsx` - wordmark rebrand
- `components/Navbar.tsx` - navigation styling
- `components/NFTGallery.tsx` - card styling
- `components/header/GunCard.tsx` - token card styling
- `components/ui/WaffleChart.tsx` - chart colors
- `components/ui/PnLLoadingIndicator.tsx` - loading colors
- `docs/BRAND.md` - implementation status

### Remaining Work
The following components still need styling updates to fully match the brand:
1. `NFTDetailModal.tsx` - Apply display/mono typography, stat card patterns
2. `PortfolioHeader.tsx` - Apply stat card layout, typography
3. `app/page.tsx` - Dashboard section headers with numbered styling

These can be updated incrementally without blocking the core rebrand.

---

## Palette Versions

GUNZscope supports two color palettes for A/B comparison:

### v1 (Original)
The default palette shipped with the rebrand.

### v2 (Accessibility Improved)
Based on brand color psychology evaluation (2026-02-02):

| Change | v1 | v2 | Rationale |
|--------|----|----|-----------|
| Loss red | `#FF4444` | `#FF5555` | WCAG contrast: 4.2:1 → 5.0:1 |
| Gray-3 | `#888888` | `#999999` | WCAG contrast: 4.6:1 → 5.7:1 |
| Lime bright | — | `#BFFF33` | High-contrast variant for 12px text |
| Info | — | `#5AC8FA` | Semantic info color (non-profit/loss/warning) |

### Switching Palettes

**UI:** Click the floating toggle in bottom-right corner
**Keyboard:** `Ctrl+Shift+P`
**Programmatic:** Use `usePalette()` hook from `@/lib/contexts/PaletteContext`

```tsx
import { usePalette } from '@/lib/contexts/PaletteContext';

function MyComponent() {
  const { palette, setPalette, togglePalette, isV2 } = usePalette();
  // ...
}
```
