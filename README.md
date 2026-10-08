# Aspir by WTS

**Experience-to-Enterprise Blueprint Engine** — an intelligent enterprise builder that ingests a founder's history, skills, achievements, capital constraints, and aspirations, then synthesizes a complete, market-validated business blueprint with an actionable 90-day execution roadmap.

## Features

- **🏠 Dashboard (command center)** — founder-readiness score, a **"needs your attention" feed** (behind-schedule phases, runway shorter than break-even, untested assumptions, stale prospects, unsaved work — each links to the fix), "your moves this week" from the roadmap, top prospects, and quick stats.
- **📥 Profile & Aspirations Intake** — a 4-step guided wizard (Foundational Profile, Assets & Constraints, Aspirations & Drivers, Past Lessons) with auto-save, progress tracking, and interactive sliders for capital/time/risk.
- **🧠 Analysis & Blueprint Matrix** — Founder-Market Fit score, auto-synthesized viable concept, experience-derived competitive moat, custom SWOT matrix, and tabbed executive views (Summary, Value & Offer, GTM, Unit Economics).
- **🗺️ Operational Roadmap** — an interactive 4-phase, 90-day execution tracker with checkbox state, per-phase and overall progress bars, custom tasks, and Markdown/JSON export.
- **📊 Financial & Risk Modeling** — CAC, LTV, LTV:CAC, break-even, gross margin, a 12-month revenue projection chart, monthly breakdown table, pricing tiers, and a risk mitigation matrix.
- **📍 Client & Company Finder** — enter a **city, country and industry** and get **real, named local businesses** pulled live from **OpenStreetMap** (Nominatim + Overpass) — with addresses, websites and phone numbers where available, a suggested contact, and an outreach template. No API key or backend needed. If the live directory can't be reached (offline, or a blocked network), it falls back to **ready-to-run Google/Maps/LinkedIn searches** that surface the same real companies. Save companies to your pipeline; export CSV. Data © OpenStreetMap contributors.
- **🔁 Prospect Pipeline** — track saved prospects through Saved → Contacted → Replied → Won/Lost with a visual funnel, per-prospect notes, inline outreach, and conversion stats.
- **🪄 AI Prompt Pack** — one click turns your blueprint into ready-to-paste prompts (landing page, sales script, content hooks, cold-email sequence, brand kit, plan review) for any AI assistant.
- **🩺 Business Evaluation (health check)** — rate an existing business across 8 weighted dimensions (product, marketing, sales, finance, customer, operations, team, growth); get an overall health score, strengths vs. weakest areas, and a prioritized list of concrete improvement ideas you can **push straight into the roadmap** as tasks. Save snapshots to track the score over time; export as Markdown.
- **⚖️ Compare Enterprises** — select up to 4 blueprints and compare fit, Year-1 revenue, CAC, LTV, break-even, and more side by side, with a weighted engine recommendation of which to build.
- **📁 Saved Enterprises** — persist multiple blueprint iterations in `localStorage`, reload, export, or delete. Full-**workspace backup / restore**: export everything (blueprints, pipeline, evaluation) to a JSON file and import it on any device, with merge or replace.

- **💷 Launch Plan (execution accountability)** — a **capital allocator** that splits your working capital across model-specific buckets with a live runway counter vs. projected break-even, and a **validation scorecard** to track your riskiest assumptions (demand, pricing, channel, retention) with evidence and a validation % that feeds your readiness score.
- **🎯 Goals & Targets (scoreboard)** — set concrete targets (customers won, revenue, roadmap completion, assumptions validated, a launch date, or any custom metric); progress auto-pulls from the pipeline, roadmap, and validation where possible, with avg-progress / achieved totals surfaced on the Dashboard and overdue dates flagged in the attention feed.
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

## Deploy

The app is a static SPA (Vite build → `dist/`), so it hosts anywhere. Asset paths
are relative (`base: './'`), so it also works from a subpath (e.g. GitHub Pages).

- **Netlify** — connect the repo; `netlify.toml` sets build `npm run build` + publish `dist` with an SPA fallback. Or drag-and-drop the `dist/` folder.
- **Vercel** — import the repo; `vercel.json` sets the Vite build, output, and rewrites.
- **GitHub Pages** — the workflow at `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**.
- **Any static host / S3 / Cloudflare Pages** — run `npm run build` and upload the `dist/` folder.

## Install as an app (PWA)

Aspir is an installable Progressive Web App. On the deployed site:
- **Desktop (Chrome/Edge):** click the **Install** button in the header, or the install icon in the address bar.
- **Android (Chrome):** tap **Install**, or browser menu → **Add to Home screen**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.

It includes a web manifest, maskable icons, and a service worker (runtime caching) so it opens full-screen and works offline after the first visit.

## AI Prompt Pack

From the Blueprint tab, **AI prompts** opens a pack of ready-to-paste prompts
(landing page, sales script, content hooks, cold-email sequence, brand kit, plan
review) pre-filled with your blueprint — copy one into any AI assistant, or
download them all as Markdown.

## Architecture

```
src/
  engine/           Deterministic analysis engine, presets, exporters
  context/          Global app state + localStorage persistence
  components/        UI primitives, header, toast
  modules/          Intake, Blueprint, Roadmap, Financials, Saved
```
