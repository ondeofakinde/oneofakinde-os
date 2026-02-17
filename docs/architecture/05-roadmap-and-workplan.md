# 05. Rollout Roadmap and Workplan

## Phase 0: Foundation (Week 0-1)

- Stand up repo structure for Next.js + contracts + lint rules.
- Implement locked glossary as machine-readable config.
- Add legacy route redirect map.
- Create baseline CI with lint, typecheck, tests.

Exit criteria:

- Canonical route map and term map are executable in CI.

## Phase 1: Core Public Surfaces (Week 1-3)

- Implement `/`, `/explore`, `/worlds`, `/watch`, `/listen`, `/read`, `/live-now`.
- Add no-leaks safety middleware and payload checks.
- Implement public studio/world/drop safe surfaces.

Exit criteria:

- `p_public_safe_render` and `p_no_leaks_ci` green.

## Phase 2: Identity + Ownership (Week 3-5)

- Implement auth/session and first-run setup.
- Implement `/my-collection` and `/library` with strict noun semantics.
- Implement certificate verification route.

Exit criteria:

- `p_auth_session_primary`, `p_session_required`, `p_library_contains_certificate`, `p_public_cert_verify` green.

## Phase 3: Monetization + Gated Media (Week 5-7)

- Implement hosted Stripe purchase flow.
- Implement webhook-driven entitlement updates.
- Implement full consume surfaces with gate checks.

Exit criteria:

- `p_stripe_checkout_redirect`, `p_media_gate_entitlement`, `p_refund_revokes_entitlement` green.

## Phase 4: Creator Back-Office (Week 7-8)

- Implement `/workshop` creator suite.
- Connect creator lifecycle signals (draft/live/archive/offers).
- Harden role-based access and audit events.

Exit criteria:

- Creator role route tests and workshop policy tests green.

## Risks and Mitigations

- **Risk:** Legacy naming reappears in UI copy.
  - **Mitigation:** Enforced lint + PR template checklist.
- **Risk:** Refund and entitlement race conditions.
  - **Mitigation:** Idempotent webhook handlers + event ordering strategy.
- **Risk:** Public payload leakage.
  - **Mitigation:** Route-level schema allowlists + automated red-team tests.
- **Risk:** Design drift from token system.
  - **Mitigation:** Token-only styling rules + visual regression checks.

## Immediate Execution Backlog

1. Create machine-readable configs from `surface map` for routes, rules, and exceptions.
2. Scaffold App Router route groups matching canonical IA.
3. Implement middleware for legacy redirects and protected-route gating.
4. Implement terminology lint package for lint targets.
5. Implement proof-ID test harness and seed route suites.
