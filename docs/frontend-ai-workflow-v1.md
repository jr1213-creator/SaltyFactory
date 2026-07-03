# Frontend AI Workflow v1

Codex implements production code.

Gemini may review screenshots, UX clarity, and visual hierarchy, but screenshot review does not replace code review.

v0 may be used only for isolated UI concepts. v0 output is not accepted unless it is adapted to SaltyFactory's components, tokens, routes, auth, and provider blockers.

shadcn/Radix-style primitives are used as design-system references. Components must live in `packages/ui` or local app components with accessible markup, visible focus states, labels, and clear disabled reasons.

Storybook is the source of component examples.

Playwright is the source of browser truth.

No AI-generated UI is accepted without:
- code review
- accessibility check
- real route wiring
- no secrets in client output
- no disabled/no-op CTAs pretending to work
- validation through lint, typecheck, tests, and build
