---
name: design-md-standard
description: Use Google's DESIGN.md format to define and validate design systems. Use when creating or updating DESIGN.md, aligning design tokens with UI implementation, or reconciling Impeccable context with structured design tokens.
disable-model-invocation: true
---

# Design MD Standard

Use this skill when a task requires a durable, machine-readable design system document.

## Goals

- Keep `DESIGN.md` compliant with Google's format.
- Keep narrative design intent aligned with token definitions.
- Keep compatibility with Impeccable's context-driven workflow.

## Workflow

1. Open `README.md` and `SPEC.md` in this skill for canonical schema and section order.
2. Ensure the file has:
   - YAML front matter with tokens
   - Markdown rationale sections
3. Validate required fundamentals:
   - `name`
   - `colors`
   - `typography`
   - component token mappings where applicable
4. Align with Impeccable:
   - Keep product voice and visual intent in prose sections.
   - Keep exact color/type/spacing/radius values in YAML tokens.
   - Map repeatable UI primitives under `components`.
5. If CLI is available, validate with:
   - `npx @google/design.md lint DESIGN.md`
6. When touching UI code, ensure tokens are actually consumed by components.

## Output expectations

- Prefer concise diffs to `DESIGN.md` and token consumer files.
- Call out any unresolved token references.
- Call out contrast or section-order issues that may break linting.
