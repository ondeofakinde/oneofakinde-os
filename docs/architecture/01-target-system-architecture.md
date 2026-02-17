# 01. Target System Architecture

## 1) Architecture Goals

- Enforce 2026 terminology and IA without drift.
- Keep public surfaces safe by default (`no leaks` contract).
- Gate premium/full media access by entitlement and refund-aware revocation.
- Support creator + collector flows in one coherent OS shell.
- Keep frontend velocity high with contract-driven Next.js architecture.

## 2) High-Level Architecture

```mermaid
flowchart LR
  U1[Public User] --> WEB[Next.js Web App]
  U2[Collector/Creator] --> WEB
  WEB --> BFF[BFF API Routes / Server Actions]

  BFF --> ID[Identity + Session Service]
  BFF --> CAT[Catalog Service\n(Worlds + Drops + Studios)]
  BFF --> LIB[Library/Ownership Service]
  BFF --> ENT[Entitlement Service]
  BFF --> PAY[Payments Service]
  BFF --> CER[Certificate Service]
  BFF --> SEA[Search Service]
  BFF --> NOTI[Notification Service]

  PAY --> STRIPE[Stripe Hosted Checkout + Webhooks]
  STRIPE --> PAY

  CAT --> DB1[(Postgres)]
  LIB --> DB1
  ID --> DB1
  ENT --> DB1
  PAY --> DB1
  CER --> DB1

  CAT --> CACHE[(Redis Cache)]
  SEA --> IDX[(Search Index)]

  BFF --> OBS[Observability\nLogs Metrics Traces]
```

## 3) Runtime Boundaries

- **Client**: Next.js app (App Router), mobile-first responsive UI.
- **BFF**: server-side orchestration for UI-specific composition and policy enforcement.
- **Core domain services**:
  - Identity/session
  - Catalog (worlds/drops/studios)
  - Library/ownership
  - Entitlements/media gate
  - Payments
  - Certificates
  - Search
  - Notifications
- **External provider**: Stripe only for checkout/receipts/refunds.

## 4) Canon Enforcement Layer

Canon contracts are treated as architecture-level controls:

- `canon_no_leaks_scan`
  - Required on all public-safe surfaces.
- `canon_media_gate`
  - Required on full consume surfaces.
- `canon_payments_stripe`
  - Purchase flow must route through hosted Stripe checkout.
- `canon_certificates`
  - Ownership validation and public certificate verification.
- `canon_feature_flags`
  - Used where rollout safety is required (e.g., `live-now`).

## 5) Key Architectural Flows

### A) Public Browse Flow

1. Request enters Next.js route.
2. BFF composes data from Catalog/Search.
3. `no leaks` policy checks run before render.
4. Public-safe response rendered/cached.

### B) Full Media Consume Flow

1. User opens `/drops/:id/watch|listen|read|photos`.
2. Session validated.
3. Entitlement checked.
4. Media access granted/denied.
5. Refund state revocation enforced.

### C) Purchase Flow

1. User starts `/pay/buy/:drop_id`.
2. BFF creates Stripe checkout session.
3. User completes hosted checkout.
4. Stripe webhook confirms payment outcome.
5. Entitlement + ownership state updated.
6. Certificate linkage and receipt records generated.

## 6) Security and Compliance Posture

- Session-required routes deny unauthenticated access server-side.
- Public surfaces are rendered from sanitized contracts only.
- Payment state changes are webhook-authoritative.
- Certificate verification route is public and immutable by design.
- PII and payment metadata separated from public catalog payloads.

## 7) Scalability and Reliability

- Cache heavy browse surfaces (`explore`, `worlds`, public studio/world detail).
- Use incremental data loading for large drop grids.
- Decompose domain services by contract module ownership.
- Add queue-based async handlers for webhook and notification fan-out.
