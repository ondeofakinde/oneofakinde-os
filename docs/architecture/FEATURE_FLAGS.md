# Feature Flags (Train7-M2)

This document defines rollout/governance hardening for runtime feature flags.

## Contract Source

- Machine-readable contract: `config/feature-flags.contract.json`
- Governance validator: `scripts/check-feature-flags-contract.ts`
- Runtime resolver: `lib/ops/feature-flags.ts`

## Flag Set

| Key | Rollout | Owner | Purpose |
| --- | --- | --- | --- |
| `surface_live_now` | `ga` | `product-platform` | Enables `/live-now` public route surface. |
| `analytics_panels_v0` | `beta` | `platform-data` | Enables analytics panel routes and page wiring for workshop/my-collection/ops. |
| `showroom_featured_lane` | `ga` | `platform-discovery` | Enables featured showroom lane behavior. |
| `collect_auctions_lane` | `ga` | `platform-commerce` | Enables collect auction lane discovery and offer flows. |
| `watch_quality_ladder` | `ga` | `platform-media` | Enables watch quality ladder fallback behavior. |
| `drop_lineage_surfaces` | `beta` | `platform-creator` | Enables lineage surfaces in workshop and drop detail. |

## Rollout Defaults

Default state by runtime:

- `development`: all current flags enabled.
- `preview`: all current flags enabled.
- `production`: all current flags enabled.

Train7-M2 policy: new flags must always ship with explicit defaults for all runtimes before merge.

## Runtime Overrides

Supported overrides:

- `OOK_FEATURE_FLAGS_JSON='{"analytics_panels_v0":false}'`
- `OOK_FEATURE_FLAGS='analytics_panels_v0=off,surface_live_now=on'`
- Per-flag env var: `OOK_FF_ANALYTICS_PANELS_V0=true|false`

Precedence order:

1. Runtime defaults (`development`/`preview`/`production`)
2. `OOK_FEATURE_FLAGS_JSON`
3. `OOK_FEATURE_FLAGS`
4. `OOK_FF_<FLAG_KEY>`

## Governance Gates

A change is release-safe only when:

- `npm run check:feature-flags` passes.
- `npm run prepare:architecture` passes (includes feature-flag validation).
- `npm run release:governance` passes (includes feature-flag validation).
- proof tests for feature-flag contract and governance pass.
