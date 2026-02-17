# 00. Requirements and Constraints

## 1) Authoritative Product Constraints

Source file: `oneofakinde-os_2026-surface map_021626.txt` (last updated 2026-02-16)

- Total normalized surfaces/routes: **30**
- Public-safe surfaces: **20**
- Session-required surfaces: **10**
- Canon controls defined in dependencies: **5**
  - `canon_no_leaks_scan`
  - `canon_media_gate`
  - `canon_payments_stripe`
  - `canon_certificates`
  - `canon_feature_flags`

## 2) Locked Terminology (Hard)

All user-facing UI must respect these nouns:

- `drop` (formerly asset)
- `world` (place/container; formerly collection-as-place)
- `my collection` (owned inventory)
- `library` (saved/curated)
- `studio` (public creator presence)
- `workshop` (creator back-office)
- consume modes: `watch`, `listen`, `read`, `live`, `photos`

Banned or remapped UI nouns:

- `asset/assets` -> `drop/drops`
- `collection/collections` (when place) -> `world/worlds`
- `profile` (creator presence) -> `studio`
- `studio` (when making suite) -> `workshop`
- `gallery` -> `photos`

## 3) Linter/Enforcement Requirements

Deterministic matching requirements:

- case-insensitive matching
- whole-word matching
- include variant matching (`asset`, `collection`, `profile`, `gallery`, `photo` variants)
- include phrase checks (`my assets`, `owned assets`, `my profile`, etc.)

Allowed exceptions:

- Billing/legal routes may use purchase/billing terms.
- Upload context may use `image/images` only as upload context.
- Technical API context may use identifiers like `asset_id` and `collection_id` in code/metadata only.

Lint targets to scan:

- `nav`, `h1`, `cta`, `empty_state`, `metadata_labels`

## 4) Capability Surface Model

Surface families in source:

- OS chrome + navigation
- Identity + access
- First-run setup
- Public studio
- Worlds and world detail
- Drop detail + sub-surfaces
- Full consume surfaces (entitlement-gated)
- Payments/checkout
- Ownership + saved curation
- Certificate verification
- Workshop (creator back-office)

## 5) Access and Safety Model

Role model:

- `public`: browse-safe routes only
- `collector`: browse + ownership + purchase + consume
- `creator`: collector capabilities + workshop

Safety model:

- Public-safe routes must pass `canon_no_leaks_scan`.
- Full consume routes (`/drops/:id/watch|listen|read|photos`) require entitlement and active session.
- Checkout is hosted (Stripe) and minting must be webhook-driven.

## 6) Visual/Brand Constraints (2026 Manual + Look and Feel)

From extracted brand manual requirements:

- Dark-first visual system (light mode optional)
- Logo-light usage strategy
- Lowercase UI/label voice as default
- Token-only styling (no one-off hex in production)
- 8px spacing grid with micro-steps
- Accessibility minimums:
  - 4.5:1 for body text
  - 3:1 for large text
  - never color-only meaning
- Motion system with explicit duration/easing classes
- Production governance: file naming, folder structure, export settings, review checklist

From `.pages` and system reference visuals:

- Content-first browsing model with card grids and media-first tiles
- Strong dark shell + creator/public profile surfaces
- Bottom-nav/mobile-first interaction model
- Legacy naming visible in older references (`collect`, `auctions`, `collections`) must be migrated to 2026 lexicon

## 7) Explicit Assumptions

- 2026 surface map overrides legacy terminology or IA from older visual references.
- Existing OpenAPI/schema modules listed in dependencies are treated as authoritative contract boundaries.
- System reference PDFs are used as visual context only where text extraction was not possible.
