# 02. Domain Model and Contracts

## 1) Core Domain Aggregates

- **Account**
  - user identity, role set, auth/session linkage
- **Studio**
  - public creator presence (`/studios/:handle`)
- **Workshop**
  - creator back-office context (`/workshop`)
- **World**
  - public grouping container for drops
- **Drop**
  - sellable/collectible unit with media modes and metadata
- **Ownership/My Collection**
  - owned drops inventory for user
- **Library**
  - saved/curated drops (non-owned bookmarks)
- **Entitlement**
  - access grants for full media consume modes
- **Offer/Activity**
  - market and event timeline data
- **Payment**
  - checkout, receipt, refund, and webhook states
- **Certificate**
  - public verification object linked to ownership provenance

## 2) Relationship Model

- Studio 1..N Worlds (optional ownership model, if creator-curated)
- World 1..N Drops
- Account 1..N Owned Drops (my collection)
- Account 1..N Saved Drops (library)
- Drop 1..N Entitlements
- Drop 1..N Offers / Activity Events
- Payment 1..N Entitlement/Ownership transitions
- Certificate 1..1 or 1..N ownership events depending on issuance policy

## 3) Contract Module Mapping (from source)

### OpenAPI modules

- `openapi_v1.auth`, `openapi_v1.session`
- `openapi_v1.catalog`, `openapi_v1.search`
- `openapi_v1.collections`, `openapi_v1.profile`
- `openapi_v1.assets`, `openapi_v1.activity`, `openapi_v1.offers`
- `openapi_v1.entitlements`
- `openapi_v1.payments`
- `openapi_v1.library`
- `openapi_v1.certificates`
- `openapi_v1.notifications`, `openapi_v1.settings`

### Schema modules

- `schema_v1.public_pages`
- `schema_v1.accounts`, `schema_v1.spaces`
- `schema_v1.catalog`, `schema_v1.collections`, `schema_v1.assets`
- `schema_v1.profiles`
- `schema_v1.activity`, `schema_v1.offers`
- `schema_v1.entitlements`
- `schema_v1.library`
- `schema_v1.payments`
- `schema_v1.certificates`

## 4) Legacy Route Migration Map

- `/collections` -> `/worlds`
- `/creators/:handle` -> `/studios/:handle`
- `/assets/:id` -> `/drops/:id`
- `/assets/:id/preview/gallery` -> `/drops/:id/preview/photos`
- `/assets/:id/view` -> `/drops/:id/photos`
- `/my-assets`, `/owned-assets`, `/owned` -> `/my-collection`
- `/saved`, `/bookmarks` -> `/library`
- `/studio` (back-office meaning) -> `/workshop`

## 5) Proof-Driven Contract Obligations

Proof IDs in source define required validations and regressions to prevent:

- `p_no_leaks_ci`
- `p_preview_safe_only`
- `p_media_gate_entitlement`
- `p_refund_revokes_entitlement`
- `p_session_required`
- `p_stripe_checkout_redirect`
- `p_public_cert_verify`
- `p_library_contains_certificate`
- `p_auth_session_primary`
- `p_first_run_destination`
- `p_public_safe_render`

These should map to explicit integration/e2e test suites tied to each route family.
