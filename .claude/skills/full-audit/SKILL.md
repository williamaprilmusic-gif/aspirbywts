---
name: full-audit
description: Run a full audit of the app after any change — compile/build check plus engine-invariant tests — then fix every error it surfaces and re-run until clean. Use after editing any source, adding a feature, refactoring, or before committing/pushing. Triggers on "audit", "full audit", "check for errors", "did I break anything", or any request to verify the app still works after changes.
---

# Full Audit

Verify the application is healthy after changes, then fix whatever breaks.

## When to run
- After editing, adding, or refactoring any source file.
- Before committing or pushing.
- Whenever the user asks to "audit", "check for errors", or "make sure nothing broke".

## Steps

1. **Build (compile check).**
   ```bash
   npm run build
   ```
   Fix any import/syntax/JSX errors it reports, then re-run.

2. **Engine invariants (logic check).**
   ```bash
   npm run audit
   ```
   This runs `scripts/audit.mjs` — 150+ assertions over every business model
   and currency: blueprint generation, fit score bounds, numeric break-even,
   12-month projections, capital-allocator budgets summing to 100%, roadmap
   gating/dates, validation scoring, scenario math, lead-finder determinism,
   outreach, competitors, and share-link round-trips. Exits non-zero on failure.

   (Shortcut: `npm run check` runs build + audit together.)

3. **Static review pass.** Check the diff for the known footguns in this repo:
   - **No dynamic Tailwind classes.** Tailwind purges class names it can't see
     as complete literal strings. Never build classes like
     `` `bg-${color}-500` ``; use a static lookup map
     (e.g. `STATUS_ACTIVE[s]`). Grep: `\$\{[^}]*\}-(500|400|300)`.
   - **Color props** passed to `Badge`/`Stat` must be one of the keys those
     components define (`emerald`, `violet`, `slate`, `amber`, `rose`).
   - **Break-even** is numeric on `bp.economics` but can be the string `'—'`
     on a computed scenario — guard comparisons with `typeof … === 'number'`.
   - **Read-only mode** (`readOnly` from context): shared viewers must not be
     able to mutate state — gate edit controls behind `!readOnly`.
   - **localStorage** access must stay wrapped in try/catch (see AppContext).
   - New engine functions that take a saved blueprint must tolerate older
     saves missing newer fields (lazy defaults, e.g. `getBudget`/`getValidation`).

4. **Report.** State checks run, pass/fail, and exactly what was fixed. If a
   failure is real and you fixed it, re-run build + audit and confirm green.
   Never report "done" while either command is red.

## Extending the audit
When you add a new engine module or invariant, add assertions to
`scripts/audit.mjs` so the guarantee is enforced on every future run.
