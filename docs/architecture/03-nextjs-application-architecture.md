# 03. Next.js Application Architecture

## 1) Frontend Platform Choice

- Framework: **Next.js (App Router)**
- Rendering strategy:
  - Server Components for data-first route shells
  - Client Components for interactive controls and media
- API orchestration:
  - Route Handlers and/or Server Actions as BFF facade

## 2) Route Grouping Strategy

Suggested `app/` route groups:

- `(public)`
  - `/`, `/explore`, `/worlds`, `/watch`, `/listen`, `/read`, `/live-now`, `/studios/:handle`, `/worlds/:id`, `/worlds/:id/drops`, `/drops/:id*`, `/certificates/:cert_id`
- `(auth)`
  - `/auth/sign-in`, `/auth/sign-up`, `/logout`
- `(collector)`
  - `/my-collection`, `/library`, `/pay/buy/:drop_id`, consume routes
- `(creator)`
  - `/workshop`, creator overlays
- `(setup)`
  - `/space-setup`

## 3) Policy and Middleware

Implement global edge/server middleware responsibilities:

- legacy route redirects to canonical routes
- terminology safety checks in lint-target payloads where applicable
- session gating for protected routes
- response hardening for public-safe surfaces

## 4) BFF Composition Pattern

BFF responsibilities:

- aggregate multiple domain contracts into UI-ready payloads
- apply per-route policy guards (`no leaks`, entitlement, role checks)
- enforce naming normalization before serialization to UI text surfaces
- isolate provider-specific logic (Stripe) from client code

## 5) State and Data Fetching

- Server-first data fetching for catalog/world/drop routes
- Cache strategy:
  - Short TTL on explore/search feeds
  - Revalidation on activity/offer mutations
  - Cache bust on payment/ownership/entitlement transitions
- Client state only for ephemeral UI interactions

## 6) UI System and Design Tokens

Required from brand constraints:

- dark-first theme tokens
- lowercase-first text conventions
- tokenized spacing/typography/color/motion only
- no ad-hoc style values in production
- accessibility contrast checks built into component contracts

Token structure recommendation:

- `core.*` primitives
- `sem.*` semantic aliases
- `comp.*` component contracts
- `motion.*` timing/easing

## 7) Testing Strategy in Next.js

Map tests to proof IDs:

- route-level e2e for gated flows
- integration tests for BFF policy gates
- snapshot/content assertions for terminology constraints in lint targets
- webhook contract tests for payment -> entitlement transitions

## 8) Suggested Monorepo Layout

```text
/apps/web                    # Next.js app
/packages/contracts          # OpenAPI clients + schema types
/packages/domain             # shared domain types/policies
/packages/ui                 # tokenized components
/packages/lint-rules         # terminology and copy guardrails
/packages/test-proofs        # proof-id mapped test suites
```
