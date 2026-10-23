# Design System & Tokens: Domma Invoice

## Typography
- Fonts:
  - Body: Geist (`--f-geist`, Google Fonts)
  - Headings: Manrope (`--f-manrope`, Google Fonts)
  - Numerics/Tabular: DM Sans (`--f-dmsans`, Google Fonts)
- Type Scale:
  - 11px: Micro (chart labels, tag pills, count badges, microcopy)
  - 12px: Meta & controls (labels, hints, subtitles, breadcrumbs, table headers, compact buttons, segmented toggles, tabs)
  - 13px: UI Body & table data (regular buttons, inputs on desktop, table cells, paragraph text)
  - 14px: Section titles (`.panel h3`, `.card h3`, modal titles)
  - Mobile (<760px): page titles 17px, h2 15px, h3 13.5px, body/paragraf/input/placeholder 13px, metrics 16px (iOS auto-zoom dicegah via `maximumScale` khusus iOS di `generateViewport`), tap target min. 40px
  - 17px: Prominent summary metrics (`.sum .row.total b`; 16px di mobile)
  - 20px: Page titles (`.top h1`), primary metric figures (`.dstat b`)
  - 24px - 30px: Marketing headline (`.login-art h2`)

## Color Tokens
- `--ink`: `#252525` (near-black primary ink)
- `--paper`: `#ffffff` (clean white surface)
- `--navy`: `#1d2939` (brand deep navy accent)
- `--mut`: `color-mix(in srgb, var(--ink) 62%, var(--paper))` (refined secondary text)
- `--line`: `color-mix(in srgb, var(--ink) 11%, var(--paper))` (subtle neutral border)
- `--soft`: `color-mix(in srgb, var(--navy) 4%, var(--paper))` (light neutral background)
- `--tint`: `color-mix(in srgb, var(--navy) 9%, var(--paper))` (navy focus / active tint)
- `--navy-mut`: `color-mix(in srgb, var(--paper) 62%, var(--navy))` (sidebar muted text)
- `--navy-line`: `color-mix(in srgb, var(--paper) 12%, var(--navy))` (sidebar dividers)
- `--navy-soft`: `color-mix(in srgb, var(--paper) 8%, var(--navy))` (sidebar hover background)

## Status Dots & Indicators
- Draft: `#98a2b3` (slate gray)
- On Check: `#f79009` (amber)
- Revision Requested: `#ee6b2f` (warm orange)
- Approved: `#12b76a` (emerald green)
- Issued: `#2e90fa` (sky blue)
- Rejected: `#f04438` (rose red)
- Cancelled: `#667085` (strikethrough slate)

## Radius
- Buttons, inputs, chips: 6px - 8px
- Panels, cards, tables wrapper: 12px
- Status pills, tags, search bars: 99px

## Spacing & Container
- Desktop sidebar width: 232px
- Content container padding: 30px 40px 60px
- Mobile breakpoint: 760px (single column, header tipis di atas + tab bar menu di bawah)
- Tablet breakpoint: 1100px (stats 2x2, stacked forms)
- Compact button height: 30px (font-size: 12px)
- Standard button / input height: 36px - 38px

## Icons
- Icon set: Outlined SVG icons in `components/Icon.tsx` (stroke width: 1.75 - 2)

## Invoice Line Item Grid
- Row 1 (Product & Type): SKU (120px) + Product (flex 1fr) + Customization (150px)
- Row 2 (Commercials & Notes): Qty (75px) + UoM (75px) + Unit price (140px) + Catatan item (flex 1fr)
- Mobile (<760px):
  - Row 1: SKU (96px) + Product (flex 1fr); Customization full width
  - Row 2: Qty + UoM (1fr 1fr); Unit price & Catatan full width
