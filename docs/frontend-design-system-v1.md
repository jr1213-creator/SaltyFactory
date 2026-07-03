# Frontend Design System v1

Status: Tailwind v4 / shadcn-style foundation.

Implemented:
- reusable SaltyFactory UI primitives in `packages/ui`
- shadcn-style `cn` helper, CVA button variants, and Radix Slot support
- Tailwind v4 package plus Studio and storefront PostCSS integration
- Tailwind v4 design tokens in `apps/studio/app/globals.css` and `apps/storefront/app/globals.css`
- `components.json` registry metadata pointing shadcn aliases at `@saltyfactory/ui`
- workflow, approval, provider, POD, AI employee, and business components
- token-based Studio and storefront styling with coral, turquoise, navy, sand, blush, and white surfaces
- coral/turquoise/navy/sand/white palette using CSS variables
- Storybook component stories in `packages/ui/src/frontend-quality.stories.tsx`
- Playwright unauthenticated route-protection harness in `e2e/studio-frontend-quality.spec.ts`
- zero remaining legacy factory-prefixed selectors or class references in `apps/studio`, `apps/storefront`, and `packages/ui`

Build note:
- Tailwind v4 loads through `@tailwindcss/postcss`.
- This Windows environment blocks the native `@tailwindcss/oxide` `.node` binding through Application Control, so `apps/studio/postcss.config.mjs` and `apps/storefront/postcss.config.mjs` set `NAPI_RS_FORCE_WASI=true` and the repo includes `@tailwindcss/oxide-wasm32-wasi`.
- The WASI fallback emits Node's experimental WASI warning during build, but the production build passes.

Accessibility rules:
- Buttons use meaningful labels.
- Disabled/action-blocked states include visible reasons on workflow pages.
- Critical setup instructions are visible in page copy, not only tooltips.

Future:
- Formal Radix-backed dialogs/dropdowns/select primitives beyond the current Radix Slot foundation.
- Authenticated Playwright visual baselines after a browser-safe Supabase Auth fixture exists.
