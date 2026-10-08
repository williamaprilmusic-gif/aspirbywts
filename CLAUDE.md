# Aspir by WTS — project guide for Claude

Experience-to-Enterprise Blueprint Engine. React 18 + Vite + Tailwind CSS,
`lucide-react` icons, React Context + `localStorage` for state. The analysis
engine is fully deterministic (no network calls).

## Layout
```
src/engine/     deterministic logic (blueprint, leadFinder, outreach,
                competitors, scenario, insights, execution, share, exporters)
src/context/    AppContext.jsx — global state + localStorage persistence
src/components/ ui.jsx primitives, Header, Toast, Tour, PrintReport
src/modules/    Dashboard, Intake, Blueprint, Roadmap, Planner, Financials,
                Finder, Pipeline, Compare, Saved
scripts/        audit.mjs (engine-invariant tests)
```

## Always run a full audit after any change
After editing, adding, or refactoring ANY source file — and before committing
or pushing — run the audit and fix everything it surfaces:

```bash
npm run check        # build (compile) + audit (150+ engine invariants)
```

Or invoke the **`full-audit`** skill (`.claude/skills/full-audit/`), which does
the build + audit and includes the static-review checklist. Do not report work
as done while `npm run build` or `npm run audit` is red. When you add a new
engine module or invariant, add matching assertions to `scripts/audit.mjs`.

## Repo footguns (the audit + skill enforce these)
- **No dynamic Tailwind classes** — Tailwind purges non-literal class names.
  Use static lookup maps, never `` `bg-${x}-500` ``.
- `Badge`/`Stat` `color` must be one of: emerald, violet, slate, amber, rose.
- `bp.economics.breakeven` is numeric; a computed scenario break-even may be
  the string `'—'` — guard with `typeof … === 'number'`.
- Respect `readOnly` (shared-link view): gate all edit controls behind it.
- Wrap every `localStorage` access in try/catch.
- Engine helpers taking a saved blueprint must lazily default newer fields so
  older saves keep working (see `getBudget`, `getValidation`).

## Branch / workflow
Develop on `claude/confident-goodall-rzlvd9`; commit with clear messages.
