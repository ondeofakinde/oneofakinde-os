## Summary
- scope:
- why:
- risk:

## Architecture + Proof Gates
- [ ] `npm run prepare:architecture`
- [ ] `npm run test:proofs`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

## Security + Release Gates
- [ ] `npm run security:audit`
- [ ] `npm run release:governance`
- [ ] webhook/payment changes include replay/idempotency tests
- [ ] no new public payload leaks (`p_no_leaks_ci` paths still green)

## Rollout
- [ ] migration impact assessed
- [ ] env vars updated
- [ ] rollback path documented
