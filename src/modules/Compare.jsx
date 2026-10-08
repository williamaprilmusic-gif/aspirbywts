import React, { useState } from 'react'
import { GitCompare, Check, Crown, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { roadmapStats } from '../engine/insights.js'

export default function Compare() {
  const { savedBlueprints, activeBlueprint, setTab } = useApp()

  // Pool = saved blueprints + the active one if it isn't saved
  const pool = [...savedBlueprints]
  if (activeBlueprint && !pool.some((b) => b.id === activeBlueprint.id)) pool.unshift(activeBlueprint)

  const [selected, setSelected] = useState(() => pool.slice(0, Math.min(3, pool.length)).map((b) => b.id))

  if (pool.length < 2) {
    return (
      <EmptyState icon={GitCompare} title="Need at least two blueprints" action={<Button className="mt-2" onClick={() => setTab('intake')}>Generate another</Button>}>
        Generate and save two or more enterprises, then compare their fit, revenue, break-even, and economics side by side
        to decide which one to build.
      </EmptyState>
    )
  }

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev))

  const chosen = pool.filter((b) => selected.includes(b.id))

  // Winner helpers (higher is better unless noted)
  const best = (key, lower = false) => {
    if (!chosen.length) return null
    let winner = chosen[0]
    for (const b of chosen) {
      const v = key(b)
      const w = key(winner)
      if ((lower && v < w) || (!lower && v > w)) winner = b
    }
    return winner.id
  }
  const fitWinner = best((b) => b.fitScore)
  const revWinner = best((b) => b.economics.year1Gross)
  const beWinner = best((b) => (typeof b.economics.breakeven === 'number' ? b.economics.breakeven : 99), true)
  const ratioWinner = best((b) => b.economics.ltvCacRatio)

  const rows = [
    { label: 'Business model', get: (b) => b.modelLabel },
    { label: 'Founder-market fit', get: (b) => `${b.fitScore}%`, winner: fitWinner, winBy: (b) => b.id === fitWinner },
    { label: 'Target audience', get: (b) => b.concept.audience },
    { label: 'Year-1 gross', get: (b) => money(b.currency, b.economics.year1Gross), winBy: (b) => b.id === revWinner },
    { label: 'CAC', get: (b) => money(b.currency, b.economics.cac) },
    { label: 'LTV', get: (b) => money(b.currency, b.economics.ltv) },
    { label: 'LTV : CAC', get: (b) => `${b.economics.ltvCacRatio}:1`, winBy: (b) => b.id === ratioWinner },
    { label: 'Break-even', get: (b) => (typeof b.economics.breakeven === 'number' ? `Month ${b.economics.breakeven}` : '—'), winBy: (b) => b.id === beWinner },
    { label: 'Gross margin', get: (b) => `${Math.round(b.economics.grossMargin * 100)}%` },
    { label: 'Roadmap progress', get: (b) => `${roadmapStats(b).pct}%` },
  ]

  // Overall recommendation: weighted score
  const scoreOf = (b) =>
    b.fitScore * 0.4 +
    Math.min(100, (b.economics.ltvCacRatio / 5) * 100) * 0.3 +
    Math.max(0, 100 - (typeof b.economics.breakeven === 'number' ? b.economics.breakeven : 24) * 4) * 0.3
  const recommended = chosen.length ? chosen.reduce((a, b) => (scoreOf(b) >= scoreOf(a) ? b : a)) : null

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="violet" className="mb-2"><GitCompare className="h-3 w-3" /> Decision Engine</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Compare Enterprises</h1>
        <p className="mt-1 text-sm text-slate-400">Pick up to 4 blueprints to compare side by side and see which one to build.</p>
      </div>

      {/* Selector */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {pool.map((b) => {
            const on = selected.includes(b.id)
            return (
              <button
                key={b.id}
                onClick={() => toggle(b.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  on ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {on && <Check className="h-4 w-4" />}
                {b.concept.productName}
              </button>
            )
          })}
        </div>
      </Card>

      {recommended && chosen.length >= 2 && (
        <Card glow className="border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-violet-500/30 text-emerald-300">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Engine recommendation</div>
              <div className="text-lg font-bold text-slate-100">{recommended.concept.productName}</div>
              <div className="text-xs text-slate-500">Best blend of founder-market fit, unit economics, and speed to break-even.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison table */}
      {chosen.length >= 1 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr>
                <th className="w-40 py-2 pr-3 text-xs uppercase tracking-wide text-slate-500">Metric</th>
                {chosen.map((b) => (
                  <th key={b.id} className="py-2 pr-3">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                      {recommended && b.id === recommended.id && <Crown className="h-4 w-4 text-amber-400" />}
                      {b.concept.productName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="py-2.5 pr-3 text-slate-400">{r.label}</td>
                  {chosen.map((b) => {
                    const win = r.winBy && r.winBy(b)
                    return (
                      <td key={b.id} className={`py-2.5 pr-3 ${win ? 'font-semibold text-emerald-300' : 'text-slate-200'}`}>
                        {r.get(b)}
                        {win && <span className="ml-1 text-emerald-400">★</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
