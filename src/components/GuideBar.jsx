import React from 'react'
import { Compass, ArrowRight, X, CheckCircle2, Circle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { nextStep } from '../engine/guide.js'

// A slim, friendly "what to do next" bar shown on every screen until the
// getting-started steps are complete (or the user hides it).
export default function GuideBar() {
  const { activeBlueprint, savedBlueprints, prospects, evaluation, setTab, readOnly, guideHidden, hideGuide } = useApp()

  if (readOnly || guideHidden) return null

  const { current, doneCount, total, allDone } = nextStep({ activeBlueprint, savedBlueprints, prospects, evaluation })
  if (allDone) return null

  return (
    <div className="no-print mb-6">
      <div className="glass flex flex-col gap-3 border-emerald-400/20 p-3.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-violet-500/25 text-emerald-300">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Step {current.number} of {total}
              </span>
              {/* progress dots */}
              <span className="hidden items-center gap-1 sm:flex" aria-hidden="true">
                {Array.from({ length: total }).map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < doneCount ? 'bg-emerald-400' : 'bg-white/20'}`} />
                ))}
              </span>
            </div>
            <div className="truncate text-sm font-semibold text-slate-100">{current.label}</div>
            <div className="truncate text-xs text-slate-400">{current.help}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => setTab(current.tab)}
            className="group/btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            {current.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
          <button
            onClick={hideGuide}
            aria-label="Hide the getting-started guide"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
            title="Hide guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// A fuller checklist card for the Dashboard.
export function GettingStarted() {
  const { activeBlueprint, savedBlueprints, prospects, evaluation, setTab } = useApp()
  const { steps, doneCount, total, allDone } = nextStep({ activeBlueprint, savedBlueprints, prospects, evaluation })
  if (allDone) return null

  return (
    <div className="glass p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold text-slate-100">Getting started</h2>
        </div>
        <span className="text-xs text-slate-400">{doneCount}/{total} done</span>
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => !s.done && setTab(s.tab)}
              disabled={s.done}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                s.done
                  ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                  : 'border-white/5 bg-white/5 hover:border-white/15'
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-500" />
              )}
              <span className="flex-1">
                <span className={`block text-sm font-medium ${s.done ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{s.label}</span>
                {!s.done && <span className="block text-xs text-slate-500">{s.help}</span>}
              </span>
              {!s.done && <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
