import React from 'react'
import {
  LayoutDashboard, Inbox, BrainCircuit, Map, LineChart, MapPin, Workflow, GitCompare, FolderOpen,
  Moon, Sun, Sparkles, HelpCircle, Eye, Wallet, Stethoscope, Target,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const NAV = [
  { id: 'dashboard', label: 'Home', full: 'Dashboard', icon: LayoutDashboard },
  { id: 'intake', label: 'Intake', full: 'Intake', icon: Inbox },
  { id: 'blueprint', label: 'Blueprint', full: 'Blueprint', icon: BrainCircuit },
  { id: 'roadmap', label: 'Roadmap', full: 'Roadmap', icon: Map },
  { id: 'goals', label: 'Goals', full: 'Goals', icon: Target },
  { id: 'planner', label: 'Plan', full: 'Launch Plan', icon: Wallet },
  { id: 'financials', label: 'Finance', full: 'Financials', icon: LineChart },
  { id: 'finder', label: 'Finder', full: 'Finder', icon: MapPin },
  { id: 'pipeline', label: 'Pipeline', full: 'Pipeline', icon: Workflow },
  { id: 'compare', label: 'Compare', full: 'Compare', icon: GitCompare },
  { id: 'evaluate', label: 'Evaluate', full: 'Evaluate', icon: Stethoscope },
  { id: 'saved', label: 'Saved', full: 'Saved', icon: FolderOpen },
]

export default function Header() {
  const { tab, setTab, theme, setTheme, activeBlueprint, savedBlueprints, prospects, restartTour, readOnly } = useApp()

  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <button onClick={() => setTab('dashboard')} className="flex shrink-0 items-center gap-2.5 focus:outline-none">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-violet-500 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-100">Aspir</span>
              <span className="mb-0.5 rounded-md border border-violet-500/30 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                by WTS
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => {
              const Icon = n.icon
              const active = tab === n.id
              const count = n.id === 'saved' ? savedBlueprints.length : n.id === 'pipeline' ? prospects.length : 0
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.full}
                  {count > 0 && (
                    <span className="ml-0.5 rounded-full bg-emerald-500/30 px-1.5 text-[10px] font-bold text-emerald-200">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                <Eye className="h-3 w-3" /> Read-only
              </span>
            )}
            {!readOnly && activeBlueprint && (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 lg:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {activeBlueprint.concept.productName}
              </span>
            )}
            {!readOnly && (
              <button
                onClick={restartTour}
                className="hidden h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid"
                title="Replay tour"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet nav */}
        <nav className="flex gap-1 overflow-x-auto pb-2 xl:hidden">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = tab === n.id
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20 text-white' : 'text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
