# Townhall Immersive QA Matrix

## Scope
- immersive enter/exit behavior for tap + scroll
- fullscreen chrome transitions (header, bottom nav, social rail, text)
- icon outline/fill behavior for social interactions

## Automated Matrix (proof tests)
| Scenario | Target | Result |
| --- | --- | --- |
| pointer tap followed by synthetic click | prevent immediate double-toggle exit | pass |
| rapid double tap on stage | debounce duplicate enter/exit transitions | pass |
| immersive + ambient scroll noise | ignore non-user-intent scroll events | pass |
| immersive + micro jitter near entry | prevent accidental exit flicker | pass |
| immersive + deliberate scroll intent | exit immersive cleanly | pass |
| non-immersive + tiny scroll with controls | keep controls visible | pass |
| non-immersive + meaningful scroll with controls | close controls | pass |

Reference test file: `tests/proofs/townhall-immersive-guards.test.ts`

## Manual Verification Checklist
| Surface | Browser/Device | Steps | Expected |
| --- | --- | --- | --- |
| `/townhall` | macOS Chrome | tap center of active drop | immersive enters, drop remains visible, chrome fades out |
| `/townhall` | macOS Chrome | tap again | immersive exits, chrome fades back with no flash |
| `/townhall` | macOS Chrome | scroll wheel immediately after enter | only deliberate scroll exits immersive |
| `/townhall/watch` | mobile Safari | tap active preview | immersive enters with no synthetic click bounce |
| `/townhall/watch` | mobile Safari | vertical swipe | exits immersive, snaps to next drop |
| `/townhall/read` | mobile Chrome | like/comment/save taps | outline icons fill on active state only |

## Exit Criteria
- no black-shell collapse during immersive mode
- no enter/exit flicker while chrome fades
- social icons render as outline-first with active fill state
