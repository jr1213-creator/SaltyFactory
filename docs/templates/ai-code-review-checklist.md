# AI Code Review Checklist

Use this checklist before accepting AI-generated code.

## Vertical Slice

- [ ] UI route/page exists.
- [ ] User-facing action exists.
- [ ] API route exists.
- [ ] UI action calls the real API route.
- [ ] Persistence/repository write exists when needed.
- [ ] Next-stage read exists.
- [ ] Empty/blocker state has a next action.

## Tests

- [ ] Success-path test exists.
- [ ] Blocked/config path test exists.
- [ ] Auth/authorization test exists for protected APIs.
- [ ] Secret redaction test exists when secrets are involved.
- [ ] Tests assert side effects, not only `ok: true`.

## Provider Integrity

- [ ] No fake provider success.
- [ ] No fake provider IDs.
- [ ] No fake images/mockups/costs/analytics/orders.
- [ ] Missing provider config returns setupRequired/blockingReasons.
- [ ] Provider token is server-side only.

## Security / Authority

- [ ] No secrets in frontend or API responses.
- [ ] Workspace isolation is enforced.
- [ ] Owner gates remain enforced.
- [ ] No AI self-authority or self-grant.
- [ ] No publish/send/spend/sync/delete/banking/order bypass.

## Docs / Reporting

- [ ] Docs are truthful.
- [ ] Feature label is accurate.
- [ ] No completion claims exceed evidence.
- [ ] Remaining blockers are stated.
- [ ] Future integrations are labeled future.
