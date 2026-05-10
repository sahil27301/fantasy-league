---
name: frontend-quality-stack
description: Unified frontend audit and implementation workflow that combines impeccable, make-interfaces-feel-better, userinterface-wiki, web-design-guidelines, react-best-practices, accessibility, best-practices, core-web-vitals, performance, and seo skills for UI-heavy tasks.
---

# Frontend Quality Stack

Use this as an orchestration layer to make practical use of installed UI skills.

## When to use

- Any UI implementation, redesign, or polish request.
- Audits spanning UX, accessibility, performance, and SEO.
- React/Next.js refactors with user-facing rendering impact.

## Execution order

1. **Design intent and consistency**
   - `impeccable`
   - `make-interfaces-feel-better`
   - `userinterface-wiki`
2. **Framework and rendering correctness**
   - `react-best-practices`
   - `web-design-guidelines`
3. **Quality and compliance**
   - `accessibility`
   - `best-practices`
   - `core-web-vitals`
   - `performance`
   - `seo`
4. **Design system structure**
   - `design-md-standard` when `DESIGN.md` is involved
5. **Image asset generation**
   - `imagegen` only when the task explicitly needs generated raster assets

## Required output format

- `Critical` issues first, then `Major`, then `Minor`.
- Provide actionable file-level fixes, not abstract advice.
- For implementation requests, apply fixes directly and report changed files.

## Guardrails

- Do not launch a dev server unless explicitly requested.
- Preserve existing user-intentional interface and API changes.
- Favor scalable, composable abstractions over one-off inline fixes.
