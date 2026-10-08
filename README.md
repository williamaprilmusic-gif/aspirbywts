# Aspir by WTS

**Experience-to-Enterprise Blueprint Engine** — an intelligent enterprise builder that ingests a founder's history, skills, achievements, capital constraints, and aspirations, then synthesizes a complete, market-validated business blueprint with an actionable 90-day execution roadmap.

## Features

- **🏠 Dashboard (command center)** — founder-readiness score, a **"needs your attention" feed** (behind-schedule phases, runway shorter than break-even, untested assumptions, stale prospects, unsaved work — each links to the fix), "your moves this week" from the roadmap, top prospects, and quick stats.
- **📥 Profile & Aspirations Intake** — a 4-step guided wizard (Foundational Profile, Assets & Constraints, Aspirations & Drivers, Past Lessons) with auto-save, progress tracking, and interactive sliders for capital/time/risk.
- **🧠 Analysis & Blueprint Matrix** — Founder-Market Fit score, auto-synthesized viable concept, experience-derived competitive moat, custom SWOT matrix, and tabbed executive views (Summary, Value & Offer, GTM, Unit Economics).
- **🗺️ Operational Roadmap** — an interactive 4-phase, 90-day execution tracker with checkbox state, per-phase and overall progress bars, custom tasks, and Markdown/JSON export.
- **📊 Financial & Risk Modeling** — CAC, LTV, LTV:CAC, break-even, gross margin, a 12-month revenue projection chart, monthly breakdown table, pricing tiers, and a risk mitigation matrix.
- **📍 Client & Company Finder** — enter a **city and country** (pre-filled from your blueprint's industry/model) to generate a ranked list of target companies/clients, each with the best contact role, a buying signal, a fit reason, and a tailored outreach angle. **One-click outreach generator** drafts a cold email, DM, and follow-up in your voice (copy to clipboard). Save prospects to your pipeline; filter by Hot/Warm/Nurture; export CSV.
- **🔁 Prospect Pipeline** — track saved prospects through Saved → Contacted → Replied → Won/Lost with a visual funnel, per-prospect notes, inline outreach, and conversion stats.
- **🩺 Business Evaluation (health check)** — rate an existing business across 8 weighted dimensions (product, marketing, sales, finance, customer, operations, team, growth); get an overall health score, strengths vs. weakest areas, and a prioritized list of concrete improvement ideas you can **push straight into the roadmap** as tasks. Save snapshots to track the score over time; export as Markdown.
- **⚖️ Compare Enterprises** — select up to 4 blueprints and compare fit, Year-1 revenue, CAC, LTV, break-even, and more side by side, with a weighted engine recommendation of which to build.
- **📁 Saved Enterprises** — persist multiple blueprint iterations in `localStorage`, reload, export, or delete. Full-**workspace backup / restore**: export everything (blueprints, pipeline, evaluation) to a JSON file and import it on any device, with merge or replace.

- **💷 Launch Plan (execution accountability)** — a **capital allocator** that splits your working capital across model-specific buckets with a live runway counter vs. projected break-even, and a **validation scorecard** to track your riskiest assumptions (demand, pricing, channel, retention) with evidence and a validation % that feeds your readiness score.
- **📅 Dated & gated roadmap** — set a launch start date and each phase shows its target window; phases soft-gate until the prior one is 60%+ done, with on-track / behind signals.

Plus: **scenario / what-if sliders** on the financial model (price, churn, CAC, acquisition pace → live projection & break-even), a generated **competitive landscape** (positioning map + your wedge) on each blueprint, **PDF/print export**, **shareable read-only links** (blueprint encoded in the URL), and a **first-run onboarding tour** (replayable from the header).
- **Export & demo** — export any blueprint as a printable Markdown report; load the *Tech Founder* or *Consultant* demo presets for an instant preview.

## Tech stack

- **React 18** (functional components + hooks)
- **Vite** build tooling
- **Tailwind CSS** — dark/light luxury theme (slates/zinc with neon emerald + violet accents, glassmorphism surfaces)
- **lucide-react** icons
- **React Context + localStorage** for state and persistence

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview the production build
```

The analytical engine (`src/engine/blueprintEngine.js`) is fully deterministic — no network calls — so blueprints generate instantly and reproducibly.

## Architecture

```
src/
  engine/           Deterministic analysis engine, presets, exporters
  context/          Global app state + localStorage persistence
  components/        UI primitives, header, toast
  modules/          Intake, Blueprint, Roadmap, Financials, Saved
```
