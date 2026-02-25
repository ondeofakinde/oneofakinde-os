# Post-P0 Remaining List (Strict DoD Map)

Generated: 2026-02-25  
Scope baseline: `origin/main` @ `7fae5cf` + this milestone branch (`codex/post-p0-phase1-heartbeat`)

## Status Legend
- `done`: implemented and covered by tests/proofs.
- `partial`: implemented in some form, but not yet at DoD depth.
- `missing`: not implemented for production flow.

## Global Release Gates (Cross-Phase)
| Gate | Status | Evidence | Remaining |
|---|---|---|---|
| Canonical glossary (`townhall/showroom/collect/photos`) + legacy redirects | done | `config/surface-map.source.txt`, `config/surface-map.generated.json`, `tests/proofs/terminology-rules.test.ts` | Keep lint gate mandatory on all PRs |
| Canonical routes + generated policy matrix | done | `scripts/generate-route-policy-tests.ts`, `tests/proofs/route-policy.generated.test.ts` | Expand proof IDs beyond route/session where applicable |
| Auth boundary session-derived (no spoofed account) | done | `tests/proofs/api-auth-boundary.test.ts` | Keep regression test locked |
| Settlement idempotency + refund revoke + certificate verify | done | `tests/proofs/refund-certificate-noleak.test.ts`, `tests/proofs/bff-persistence-payments.test.ts` | Add auction/resale settlement proofs |
| Price visibility protocol (primary public, secondary/auction policy) | partial | partial market lane UI exists in `features/collect/collect-marketplace-screen.tsx` | Implement real resale/auction settlement visibility rules |

## Phase 1 — Discovery Loop (Instagram/TikTok)
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| Showroom infinite scroll | partial | snap feed exists in `features/townhall/townhall-feed-screen.tsx` | Add cursor pagination + append pipeline |
| Showroom filters + ordering modes | partial | mode routes exist (`/townhall/*`) and this milestone adds ordering controls | Add backend query contract for ordering/filter telemetry attribution |
| Immersive drop view + info drawer | partial | overlay panels (`comments/collect/share`) in townhall feed | Stabilize immersive toggle matrix + explicit info drawer state machine |
| Like/comment/send/library actions | done | `/api/v1/townhall/social/*`, `tests/proofs/townhall-social-persistence.test.ts` | Add moderation hooks in phase 4 |
| Exposure + interaction logs | partial | telemetry ingest + persistence exists (`/api/v1/townhall/telemetry`) | Add explicit exposure/impression logging with dwell semantics |

## Phase 2 — Market Loop (Etsy/eBay/StockX)
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| Collect inventory lanes | partial | sale/auction/resale lanes in `features/collect/collect-marketplace-screen.tsx` | Back lanes with persistent offer objects |
| Offer state machine | missing | — | Implement offer lifecycle (open/counter/accepted/expired/cancelled) |
| Resale fixed offers | missing | — | Add listing + acceptance + settlement + private execution values |
| Auctions (bid/award/settle/fallback) | missing | `/auctions` redirects into collect lane only | Implement bid book + winner selection + settlement fallback |
| Integrity flags + enforcement signals | missing | — | Add flag objects + enforcement APIs + proofs |

## Phase 3 — Consumption Loop (Audio/Text)
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| Listen background play + resume + logs | partial | listen surfaces exist (`/listen`, `/drops/:id/listen`) | Add persisted playback position + resume service |
| Read progress + TOC + logs | partial | read surfaces exist (`/read`, `/drops/:id/read`) | Add progress checkpoints + TOC model |
| World sequencing / continuation | missing | world pages exist, no sequencing contract | Add world sequencing state and continuation actions |

## Phase 4 — Community Moat (Discord/Patreon)
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| Membership entitlements + eligibility checks | missing | no membership object/API yet | Implement membership domain + entitlement evaluator |
| Gated events inside collect | missing | — | Build events model and collect integration |
| Live sessions lifecycle (workshop→collect→studio memberships) | partial | live surfaces exist (`/live`, `/townhall/live`) | Add session creation, gating, enrollment, artifact handling |
| Threads + moderation primitives | missing | only drop comments currently | Add scoped threads + moderation actions |
| Reporting/cases/appeals admin | missing | — | Add reporting workflow and admin review surfaces |

## Phase 5 — Watch Hardening (YouTube)
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| Watch entitlement gate + signed access | partial | entitlement routes + proofs exist | Add signed media token issuance + verification |
| Watch progress + resume | missing | — | Persist watch checkpoints and restore on re-entry |
| Quality ladder | missing | — | Add adaptive quality levels + fallback policy |
| Studio pins + world ordering polish | missing | — | Add curator pins + ordering controls in studio/world |
| Watch logs | partial | townhall telemetry logs watch_time/completion | Add dedicated watch-surface progress + completion logs |

## Phase 6 — Programmable Worlds + Collaboration
| DoD Item | Status | Evidence | Remaining |
|---|---|---|---|
| World collect bundle types (`current_only`, `season_pass_window`, `full_world`) | missing | — | Add world bundle model + pricing strategy |
| Upgrade path partial→full world collect | missing | — | Add proration/credit policy + provenance append rules |
| Workshop release scheduling / pacing queue | missing | — | Build release queue and publish scheduler |
| Live sessions attached to worlds as episodes | missing | — | Add world-linked live session references |
| Versioned drops + authorized derivatives | missing | — | Add version graph + attribution + split rules |
| Enforceable revenue splits for collaborators | missing | — | Add split contracts + settlement allocations |

## Immediate Milestone Queue (Post-P0)
1. `Phase1-M1` (this PR): Townhall ordering controls + ranking modes + proof coverage.
2. `Phase1-M2`: exposure/impression logging + cursor-based infinite feed pagination.
3. `Phase1-M3`: immersive/info-drawer state hardening + regression matrix lock.
4. `Phase2-M1`: persistent collect offer objects + state machine foundation.

