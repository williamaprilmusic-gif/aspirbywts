import React, { useState } from 'react'
import { LineChart, TrendingUp, Megaphone, Zap, Target, Percent, ShieldAlert, Clock, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState, Stat, Field } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { defaultScenario, computeScenario } from '../engine/scenario.js'

export default function Financials() {
  const { activeBlueprint: bp, setTab } = useApp()

  if (!bp) {
    return (
      <EmptyState icon={LineChart} title="No financial model yet" action={<Button className="mt-2" onClick={() => setTab('intake')}>Start intake</Button>}>
        Generate a blueprint to see unit economics, a 12-month revenue projection, and the risk mitigation matrix.
      </EmptyState>
    )
  }

  const m = (v) => money(bp.currency, v)
  const eco = bp.economics
  const maxRev = Math.max(...eco.monthlyDeals.map((d) => d.revenue), 1)
  const ratioHealthy = eco.ltvCacRatio >= 3

  const sevColor = { High: 'rose', Medium: 'amber', Low: 'emerald' }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="emerald" className="mb-2"><LineChart className="h-3 w-3" /> Feasibility Dashboard</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Financial & Risk Modeling</h1>
        <p className="mt-1 text-sm text-slate-400">Unit economics and 12-month projections for {bp.concept.productName}.</p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CAC" value={m(eco.cac)} icon={Megaphone} color="amber" sub="Customer acquisition" />
        <Stat label="LTV" value={m(eco.ltv)} icon={TrendingUp} color="emerald" sub="Lifetime value" />
        <Stat label="LTV : CAC" value={`${eco.ltvCacRatio}:1`} icon={Zap} color={ratioHealthy ? 'emerald' : 'rose'} sub={ratioHealthy ? 'Healthy (≥3)' : 'Needs work'} />
        <Stat label="Break-even" value={`Month ${eco.breakeven}`} icon={Clock} color="violet" sub="Projected" />
        <Stat label="Gross margin" value={`${Math.round(eco.grossMargin * 100)}%`} icon={Percent} color="emerald" />
        <Stat label="Monthly churn" value={eco.churnMonthly > 0 ? `${(eco.churnMonthly * 100).toFixed(1)}%` : 'n/a'} icon={Target} color="amber" />
        <Stat label="Avg. lifetime" value={eco.churnMonthly > 0 ? `${eco.lifetimeMonths} mo` : 'one-off'} icon={Clock} color="violet" />
        <Stat label="Year-1 gross" value={m(eco.year1Gross)} icon={TrendingUp} color="emerald" />
      </div>

      {/* Projection chart */}
      <Card strong>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100">12-Month Revenue Projection</h2>
          </div>
          <Badge color="emerald">Total {m(eco.year1Gross)}</Badge>
        </div>
        <div className="flex h-56 items-end gap-1.5 sm:gap-2">
          {eco.monthlyDeals.map((d) => {
            const h = Math.max(4, (d.revenue / maxRev) * 100)
            return (
              <div key={d.month} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/60 to-violet-500/80 transition-all duration-500 group-hover:from-emerald-400 group-hover:to-violet-400"
                    style={{ height: `${h}%` }}
                  />
                  <div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 group-hover:block">
                    {m(d.revenue)} · {d.activeCustomers} cust
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">M{d.month}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Scenario / what-if */}
      <ScenarioPanel bp={bp} m={m} />

      {/* Economics table + pricing */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 overflow-x-auto">
          <h2 className="mb-3 font-semibold text-slate-100">Monthly Breakdown</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Month</th>
                <th className="py-2 pr-2">New</th>
                <th className="py-2 pr-2">Active</th>
                <th className="py-2 pr-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {eco.monthlyDeals.map((d) => (
                <tr key={d.month} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-2 text-slate-300">Month {d.month}</td>
                  <td className="py-2 pr-2 text-slate-400">+{d.newCustomers}</td>
                  <td className="py-2 pr-2 text-slate-400">{d.activeCustomers}</td>
                  <td className="py-2 pr-2 text-right font-medium text-emerald-300">{m(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-slate-100">
                <td className="pt-3" colSpan={3}>Year-1 total</td>
                <td className="pt-3 text-right text-emerald-300">{m(eco.year1Gross)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-100">Pricing Tiers</h2>
          <div className="space-y-3">
            {eco.priceTiers.map((t, i) => (
              <div key={t.name} className={`rounded-xl border p-3 ${i === 1 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{t.name}</span>
                  <span className="text-sm font-bold text-emerald-300">{m(t.price)}<span className="text-xs font-normal text-slate-500">{t.cadence}</span></span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Risk matrix */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h2 className="font-semibold text-slate-100">Risk Mitigation Matrix</h2>
        </div>
        <div className="space-y-3">
          {bp.riskMatrix.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_auto_2fr] sm:items-center">
              <div className="font-medium text-slate-200">{r.risk}</div>
              <Badge color={sevColor[r.severity]}>{r.severity}</Badge>
              <div className="text-sm text-slate-400"><span className="text-emerald-300">→ </span>{r.mitigation}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ScenarioPanel({ bp, m }) {
  const [s, setS] = useState(() => defaultScenario(bp))
  const sc = computeScenario(bp, s)
  const maxRev = Math.max(...sc.monthlyDeals.map((d) => d.revenue), 1)
  const reset = () => setS(defaultScenario(bp))
  const baseGross = bp.economics.year1Gross
  const delta = baseGross ? Math.round(((sc.year1Gross - baseGross) / baseGross) * 100) : 0

  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: Number(e.target.value) }))

  return (
    <Card strong>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-violet-400" />
          <h2 className="font-semibold text-slate-100">What-If Scenario Modeling</h2>
        </div>
        <Button variant="subtle" icon={RotateCcw} onClick={reset}>Reset</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-4">
          <Field label="Pricing" hint={`${s.priceMult.toFixed(2)}× · ${m(sc.acv)} ACV`}>
            <input type="range" min={0.5} max={2} step={0.05} value={s.priceMult} onChange={set('priceMult')} className="w-full" />
          </Field>
          <Field label="Monthly churn" hint={`${(s.churnMonthly * 100).toFixed(1)}%`}>
            <input type="range" min={0} max={0.15} step={0.005} value={s.churnMonthly} onChange={set('churnMonthly')} className="w-full" />
          </Field>
          <Field label="CAC" hint={m(sc.cac)}>
            <input type="range" min={Math.max(1, Math.round(bp.economics.cac * 0.3))} max={Math.round(bp.economics.cac * 2.5)} step={1} value={s.cac} onChange={set('cac')} className="w-full" />
          </Field>
          <Field label="Acquisition pace" hint={`${s.growthMult.toFixed(2)}× new customers`}>
            <input type="range" min={0.3} max={3} step={0.05} value={s.growthMult} onChange={set('growthMult')} className="w-full" />
          </Field>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ScenarioStat label="LTV:CAC" value={`${sc.ltvCacRatio}:1`} good={sc.ltvCacRatio >= 3} />
            <ScenarioStat label="Break-even" value={typeof sc.breakeven === 'number' ? `Mo. ${sc.breakeven}` : '—'} good={typeof sc.breakeven === 'number' && sc.breakeven <= 9} />
            <ScenarioStat label="Year-1" value={m(sc.year1Gross)} good={delta >= 0} />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <span className="text-slate-400">vs. base Year-1 ({m(baseGross)}): </span>
            <span className={delta >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          </div>
          <div className="flex h-28 items-end gap-1">
            {sc.monthlyDeals.map((d) => (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t bg-gradient-to-t from-violet-500/60 to-emerald-500/80 transition-all" style={{ height: `${Math.max(3, (d.revenue / maxRev) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Break-even here = first month cumulative gross-margin revenue covers cumulative acquisition spend.</p>
        </div>
      </div>
    </Card>
  )
}

function ScenarioStat({ label, value, good }) {
  return (
    <div className={`rounded-xl border p-3 ${good ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
    </div>
  )
}
