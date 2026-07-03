# Frontend Design System v1

Status: functional foundation.

Implemented:
- reusable SaltyFactory UI primitives in `packages/ui`
- workflow, approval, provider, POD, AI employee, and business components
- token-based Studio styling in `apps/studio/app/globals.css`
- coral/turquoise/navy/sand/white palette using CSS variables
- Storybook component stories in `packages/ui/src/frontend-quality.stories.tsx`
- Playwright unauthenticated route-protection harness in `e2e/studio-frontend-quality.spec.ts`

Accessibility rules:
- Buttons use meaningful labels.
- Disabled/action-blocked states include visible reasons on workflow pages.
- Critical setup instructions are visible in page copy, not only tooltips.

Future:
- Formal Radix-backed dialogs/dropdowns/select primitives for richer interactions.
- Authenticated Playwright visual baselines after a browser-safe Supabase Auth fixture exists.
