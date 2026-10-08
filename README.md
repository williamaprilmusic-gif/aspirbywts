# Aspir by WTS

**Experience-to-Enterprise Blueprint Engine** — an intelligent enterprise builder that ingests a founder's history, skills, achievements, capital constraints, and aspirations, then synthesizes a complete, market-validated business blueprint with an actionable 90-day execution roadmap.

## Features

- **📥 Profile & Aspirations Intake** — a 4-step guided wizard (Foundational Profile, Assets & Constraints, Aspirations & Drivers, Past Lessons) with auto-save, progress tracking, and interactive sliders for capital/time/risk.
- **🧠 Analysis & Blueprint Matrix** — Founder-Market Fit score, auto-synthesized viable concept, experience-derived competitive moat, custom SWOT matrix, and tabbed executive views (Summary, Value & Offer, GTM, Unit Economics).
- **🗺️ Operational Roadmap** — an interactive 4-phase, 90-day execution tracker with checkbox state, per-phase and overall progress bars, custom tasks, and Markdown/JSON export.
- **📊 Financial & Risk Modeling** — CAC, LTV, LTV:CAC, break-even, gross margin, a 12-month revenue projection chart, monthly breakdown table, pricing tiers, and a risk mitigation matrix.
- **📍 Client & Company Finder** — enter a **city and country** (pre-filled from your blueprint's industry/model) to generate a ranked list of target companies/clients, each with the best contact role, a buying signal, a fit reason, and a tailored outreach angle. Filter by Hot/Warm/Nurture and export the list as CSV.
- **📁 Saved Enterprises** — persist multiple blueprint iterations in `localStorage`, reload, export, or delete.
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
