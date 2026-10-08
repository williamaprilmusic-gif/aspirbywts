import React from 'react'
import {
  LayoutDashboard, Sparkles, CheckCircle2, Circle, Flame, ArrowRight, Rocket, Gauge, Target, Building2, TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, ProgressBar, EmptyState, ScoreRing } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { readinessScore, readinessBand, nextActions, topProspects, roadmapStats, pipelineFunnel } from '../engine/insights.js'

export default function Dashboard() {
  const { activeBlueprint: bp, prospects, savedBlueprints, setTab, toggleTask } = useApp()

  if (!bp) {
    return (
      <EmptyState icon={LayoutDashboard} title="Welcome to Aspir by WTS" action={
        <div className="mt-2 flex gap-2">
          <Button icon={Rocket} onClick={() => setTab('intake')}>Start intake</Button>
        </div>
      }>
        This is your command center. Complete the intake and generate a blueprint, then come back here for your weekly
        actions, pipeline snapshot, and founder-readiness score.
      </EmptyState>
    )
  }

  const readiness = readinessScore(bp, prospects)
  const band = readinessBand(readiness)
  const actions = nextActions(bp, 4)
  const hot = topProspects(bp, prospects, 3)
  const { done, total, pct } = roadmapStats(bp)
  const funnel = pipelineFunnel(prospects, bp.id)

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge color="emerald" className="mb-2"><Sparkles className="h-3 w-3" /> Command Center</Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
            Building {bp.concept.productName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">Your focused view of what moves the needle this week.</p>
        </div>
        <Button variant="ghost" icon={ArrowRight} onClick={() => setTab('blueprint')}>Open blueprint</Button>
      </div>

      {/* Top row: readiness + quick stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card strong className="flex flex-col items-center justify-center text-center">
          <div className="relative">
            <ScoreRing score={readiness} />
          </div>
          <div className="mt-2">
            <div className="text-xs uppercase tracking-widest text-slate-400">Founder readiness</div>
            <Badge color={band.color} className="mt-1">{band.label}</Badge>
          </div>
          <p className="mt-3 text-xs text-slate-500">Blends your fit score, execution progress, pipeline activity, and reflection depth.</p>
        </Card>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <MiniStat icon={Gauge} label="Roadmap" value={`${pct}%`} sub={`${done}/${total} tasks done`} onClick={() => setTab('roadmap')} />
          <MiniStat icon={Building2} label="Pipeline" value={funnel.total} sub={`${funnel.counts.Won} won · ${funnel.counts.Contacted + funnel.counts.Replied} active`} onClick={() => setTab('pipeline')} />
          <MiniStat icon={TrendingUp} label="Year-1 proj." value={money(bp.currency, bp.economics.year1Gross)} sub={`break-even mo. ${bp.economics.breakeven}`} onClick={() => setTab('financials')} />
          <MiniStat icon={Target} label="Fit score" value={`${bp.fitScore}%`} sub={`${savedBlueprints.length} saved enterprise${savedBlueprints.length === 1 ? '' : 's'}`} onClick={() => setTab('blueprint')} />
        </div>
      </div>

      {/* This week's moves + hot prospects */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="font-semibold text-slate-100">Your moves this week</h2>
            </div>
            <button onClick={() => setTab('roadmap')} className="text-xs text-emerald-300 hover:text-emerald-200">Full roadmap →</button>
          </div>
          {actions.length ? (
            <ul className="space-y-2">
              {actions.map((a) => (
                <li key={a.taskId} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                  <button onClick={() => toggleTask(a.phaseId, a.taskId)} className="mt-0.5 shrink-0 text-slate-500 hover:text-emerald-400">
                    <Circle className="h-5 w-5" />
                  </button>
                  <div>
                    <div className="text-sm text-slate-200">{a.text}</div>
                    <div className="text-xs text-slate-500">{a.phase} · {a.window}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
              🎉 Every roadmap task is done. Time to set your next 90-day targets.
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <h2 className="font-semibold text-slate-100">Top prospects to chase</h2>
            </div>
            <button onClick={() => setTab('finder')} className="text-xs text-emerald-300 hover:text-emerald-200">Find more →</button>
          </div>
          {hot.length ? (
            <ul className="space-y-2">
              {hot.map((p) => (
                <li key={p.key || p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.buyerRole} · {p.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-300">{p.fit}%</div>
                    <Badge color={p.status === 'Won' ? 'emerald' : p.status === 'Lost' ? 'rose' : 'slate'}>{p.status || p.priority}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              No saved prospects yet. Head to the <button onClick={() => setTab('finder')} className="text-emerald-300 underline">Finder</button> to build your pipeline.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, sub, onClick }) {
  return (
    <button onClick={onClick} className="glass p-4 text-left transition hover:border-white/20">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
          <div className="text-xl font-bold text-slate-100">{value}</div>
          <div className="text-xs text-slate-500">{sub}</div>
        </div>
      </div>
    </button>
  )
}
