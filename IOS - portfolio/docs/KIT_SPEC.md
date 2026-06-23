# iOS / iPadOS 26 Kit — Exact Spec (from Figma)

> Source: Apple Design Resources "iOS and iPadOS 26 UI Kit" — file `zpPTv9MSTxRfsOOVgjYq4N`, all 45 pages. Values pulled via hosted Figma MCP `get_design_context` on canonical frames (exact hex / blur / px from the design, not eyeballed).

## 1. System Colors — Default (vibrant accents)

Per mode (light → dark):

| Token | Light | Dark |
|---|---|---|
| Red | `#FF383C` | `#FF4245` |
| Orange | `#FF8D28` | `#FF9230` |
| Yellow | `#FFCC00` | `#FFD600` |
| Green | `#34C759` | `#30D158` |
| Mint | `#00C8B3` | `#00DAC3` |
| Teal | `#00C3D0` | `#00D2E0` |
| Cyan | `#00C0E8` | `#3CD3FE` |
| Blue (Accent / Link) | `#0088FF` | `#0091FF` |
| Indigo | `#6155F5` | `#6D7CFF` |
| Purple | `#CB30E0` | `#DB34F2` |
| Pink | `#FF2D55` | `#FF375F` |
| Brown | `#AC7F5E` | `#B78A66` |

## 2. System Grays

| Token | Light | Dark |
|---|---|---|
| Gray | `#8E8E93` | `#8E8E93` |
| Gray 2 | `#AEAEB2` | `#636366` |
| Gray 3 | `#C7C7CC` | `#48484A` |
| Gray 4 | `#D1D1D6` | `#3A3A3C` |
| Gray 5 | `#E5E5EA` | `#2C2C2E` |
| Gray 6 | `#F2F2F7` | `#1C1C1E` |

## 3. Vibrant labels (text over glass materials)

Light:
- Primary: `#000000`
- Secondary: `#3D3D3D` (rgba in mix)
- Tertiary: `rgba(80,80,80,0.7)` (effective)
- Quaternary: `rgba(72,72,72,0.6)`

Dark:
- Primary: `#FFFFFF`
- Secondary: `#999999`
- Tertiary: `#404040`
- Quaternary: `#262626`

## 4. Vibrant fills (controls over glass)

Light:
- Primary: `#CCCCCC`
- Secondary: `#E0E0E0`
- Tertiary: `#EDEDED`

Dark:
- Primary: `#333333`
- Tertiary: `#121212`

## 5. Materials (Liquid Glass) — THE CRITICAL VALUES

Every material is a frosted-glass layer over a wallpaper. Material radius: **20px** in this reference frame (real iOS uses 18-28px depending on container; sheet handles separately).

### Regular (Default) — light mode
- `backdrop-filter: blur(50px)` (**not 24px**; this is the main fidelity miss)
- Layer 1 (primary fill): `background: rgba(255,255,255,0.60); mix-blend-mode: color-dodge`
- Layer 2 (highlight): `background: rgba(255,255,255,0.25); mix-blend-mode: plus-lighter`

### Regular (Default) — dark mode
- `backdrop-filter: blur(50px)`
- Single fill: `background: rgba(0,0,0,0.41)`

### Thin / Ultrathin / Thick — same blur, varying fill opacities
- Ultrathin light: blur(50px), bg-white ~30-35%
- Thin light: blur(50px), bg-white ~45%
- Thick light: blur(50px), bg-white ~75-80%
- Chrome: blur(50px), bg-white ~90% (near-opaque, used for keyboards / dock)
- Dark variants mirror with black fills: ultrathin 20%, thin 30%, thick 55%, chrome 80%

### Liquid Glass — Regular — Small (48×48 control pill, NEW iOS 26)
Light default:
- `bg: rgba(255,255,255,0.65)`
- + overlay `#DDDDDD` with `mix-blend-mode: color-burn`
- + overlay `#F7F7F7` with `mix-blend-mode: darken`
- `box-shadow: 0 8px 40px rgba(0,0,0,0.12)`
- `border-radius: 296px` (fully pill)

Dark default:
- `bg: rgba(204,204,204,0.5)` with `mix-blend-mode: color-burn`
- + gradient `linear-gradient(rgba(255,255,255,.06), rgba(255,255,255,.06)) over rgba(0,0,0,.6)`
- + glass effect `rgba(0,0,0,0.2)` with `mix-blend-mode: screen`
- opacity 0.67
- `box-shadow: 0 8px 40px rgba(0,0,0,0.12)`

Tinted Primary (uses an accent color):
- base `rgba(255,255,255,0.75)`
- + `white` with `mix-blend-mode: saturation`
- + `#999999` with `mix-blend-mode: overlay`
- + accent (e.g. `#0091FF`) at 100%
- same shadow

### Scroll edge effect
Top/Bottom/Leading/Trailing soft edges — a fading frosted blur at the edge of scroll containers; "Hard" variant is a clipping plane. Not critical for v1.

## 6. Typography — exact ramp at Large (Default) Dynamic Type

Font family: `"SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`. Weights: Regular 400, Medium 510, Semibold 590, Bold 700.

| Style | Size / Line | Weight | Letter-spacing |
|---|---|---|---|
| Large Title | 34 / 41 | 400 | +0.40 |
| Title 1 | 28 / 34 | 400 | +0.38 |
| Title 2 | 22 / 28 | 400 | -0.26 |
| Title 3 | 20 / 25 | 400 | -0.45 |
| Headline | 17 / 22 | **590** | -0.43 |
| Body | 17 / 22 | 400 | -0.43 |
| Callout | 16 / 21 | 400 | -0.31 |
| Subhead | 15 / 20 | 400 | -0.23 |
| Footnote | 13 / 18 | 400 | -0.08 |
| Caption 1 | 12 / 16 | 400 | 0 |
| Caption 2 | 11 / 13 | 400 | +0.06 |

(Dynamic Type also has xSmall/Small/Medium/Large/xLarge/xxLarge/xxxLarge + AX1–AX5 — see Figma "Dynamic Type" section. Not critical here.)

## 7. App icon (iPhone)

- Tile: 64×64 (system) — icon is the squircle
- Label below tile, 5px gap
- Label text: SF Pro **Medium (510)**, 12px, color `white`, `text-shadow: 0 2px 25px rgba(0,0,0,0.85)` (text shadow over wallpaper)
- Badge: red `#FF383C` pill, `min-width: 24px`, fully rounded, 16px text white, positioned `top: -12px; left: calc(50% + 33px)`
- iPad icon tile: 68×90.5 area, larger icon (~76px effective)

## 8. Separators
- Non-opaque separator over material: `rgba(0,0,0,0.12)` light, `rgba(255,255,255,0.16)` dark, with `mix-blend-mode: luminosity` for color-true rendering
- 0.5px hairline (sub-pixel separator)

## 9. Material sheet radius (for our app sheets / control center)
- Reference frame uses `20px` for material containers
- Real iOS sheets: 36px corner radius at the top edge (sheet detents) — we'll use this
- Cards/lists: 10-16px depending on context (inset-grouped rows: 10px)

## 10. CHANGES TO APPLY (concrete)

### `assets/css/tokens.css` — the big wins
- `--glass-blur: 24px` → **`50px`** (most impactful single change)
- `--glass-fill` (light, currently `rgba(255,255,255,.12)`) → **`rgba(255,255,255,0.60)`**
- `--glass-fill` (dark, currently `rgba(255,255,255,.12)`) → **`rgba(0,0,0,0.41)`**
- `--glass-fill-thick` (light) → **`rgba(255,255,255,0.78)`**
- `--glass-fill-thick` (dark) → **`rgba(0,0,0,0.62)`**
- Add `--glass-highlight-inset` for the secondary plus-lighter layer in light (`rgba(255,255,255,0.25)`)
- System accent vars set to **exact** kit hex (table §1)
- System grays set to **exact** kit hex (table §2)
- Text colors → vibrant labels (table §3) per mode
- Type vars: keep sizes, **add letter-spacing values** per style (table §6)
- Headline weight: ensure 590 (Semibold), not generic 600

### `assets/css/shell.css` — anatomy
- App icon tile: ensure 64px square at iPhone, label SF Pro Medium **510** with text-shadow `0 2px 25px rgba(0,0,0,0.85)` (so labels stay legible on any wallpaper)
- Icon-label gap: 5px (kit value)
- Lock screen notification card: 18px radius, blur 50px, fill .60 light / .41 dark, padding ~14px
- Dock / status bar tint: bump to thick material (fill ~.78 / .62)
- Page dots: 6px filled / 6px outlined; active uses primary label

### `assets/css/apps.css`
- List rows (inset grouped): 10px radius, separator color `rgba(60,60,67,0.36)` light / `rgba(84,84,88,0.65)` dark
- Buttons: use accent system tokens; pill-shape buttons get the Liquid Glass Small treatment (shadow + highlight layers)

### `index.html`
- No structural change required for fidelity — markup is correct; tokens drive the look.
