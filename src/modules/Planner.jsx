import React from 'react'
import {
  Wallet, ShieldCheck, PiggyBank, Clock, AlertTriangle, CheckCircle2, FlaskConical, RotateCcw,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState, ProgressBar, Field } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import {
  getBudget, budgetStats, defaultBudget, getValidation, defaultValidation, validationScore,
  VALIDATION_STATUSES,
} from '../engine/execution.js'

// Static classes (Tailwind can't see dynamically built strings)
const STATUS_ACTIVE = {
  untested: 'border-slate-500/50 bg-slate-500/15 text-slate-200',
  testing: 'border-amber-500/50 bg-amber-500/15 text-amber-200',
  validated: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  invalidated: 'border-rose-500/50 bg-rose-500/15 text-rose-200',
}

export default function Planner() {
  const { activeBlueprint: bp, updateActiveBlueprint, setTab, readOnly, notify } = useApp()

  if (!bp) {
    return (
      <EmptyState icon={Wallet} title="No launch plan yet" action={<Button className="mt-2" onClick={() => setTab('intake')}>Start intake</Button>}>
        Generate a blueprint to plan how you'll deploy your capital and validate your riskiest assumptions before you spend.
      </EmptyState>
    )
  }

  const budget = getBudget(bp)
  const validation = getValidation(bp)
  const { totalPct, runway, balanced } = budgetStats(budget)
  const m = (v) => money(bp.currency, v)
  const valScore = validationScore(validation)

  const setAllocationPct = (key, pct) => {
    if (readOnly) return
    updateActiveBlueprint((prev) => {
      const base = prev.budget || defaultBudget(prev)
      const allocations = base.allocations.map((a) => (a.key === key ? { ...a, pct: Number(pct) } : a))
      return { ...prev, budget: { ...base, allocations } }
    })
  }
  const setBurn = (v) => {
    if (readOnly) return
    updateActiveBlueprint((prev) => {
      const base = prev.budget || defaultBudget(prev)
      return { ...prev, budget: { ...base, monthlyBurn: Math.max(0, Number(v) || 0) } }
    })
  }
  const resetBudget = () => {
    if (confirm('Reset the capital allocation to defaults?')) updateActiveBlueprint((prev) => ({ ...prev, budget: defaultBudget(prev) }))
  }

  const setValidation = (key, patch) => {
    if (readOnly) return
    updateActiveBlueprint((prev) => {
      const base = prev.validation && prev.validation.length ? prev.validation : defaultValidation(prev)
      return { ...prev, validation: base.map((v) => (v.key === key ? { ...v, ...patch } : v)) }
    })
  }
  const resetValidation = () => {
    if (confirm('Reset the validation scorecard? Your evidence notes will be cleared.'))
      updateActiveBlueprint((prev) => ({ ...prev, validation: defaultValidation(prev) }))
  }

  const capital = budget.capital

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <div>
        <Badge color="emerald" className="mb-2"><Wallet className="h-3 w-3" /> Execution Accountability</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Launch Plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Decide where your capital goes and prove your riskiest assumptions before you bet on them.
        </p>
      </div>

      {/* Capital allocator */}
      <Card strong>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100">Capital Allocator</h2>
          </div>
          {!readOnly && <Button variant="subtle" icon={RotateCcw} onClick={resetBudget}>Reset</Button>}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {budget.allocations.map((a) => (
              <div key={a.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-200">{a.label}</span>
                  <span className="text-slate-400">
                    <span className="font-semibold text-emerald-300">{m((capital * a.pct) / 100)}</span> · {a.pct}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={60} value={a.pct} disabled={readOnly}
                  onChange={(e) => setAllocationPct(a.key, e.target.value)} className="w-full"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className={`rounded-xl border p-4 ${balanced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {balanced ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                <span className={balanced ? 'text-emerald-300' : 'text-amber-300'}>
                  {totalPct}% allocated
                </span>
              </div>
              <ProgressBar value={totalPct} max={100} className="mt-2" />
              {!balanced && <p className="mt-2 text-xs text-slate-400">{totalPct > 100 ? 'Over-allocated — trim a bucket.' : 'Under-allocated — assign the rest.'}</p>}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Total capital</div>
              <div className="text-2xl font-extrabold text-slate-100">{m(capital)}</div>
            </div>

            <Field label="Monthly fixed cost" hint={m(budget.monthlyBurn)}>
              <input
                type="range" min={0} max={Math.max(100, Math.round(capital / 2) || 100)} step={10}
                value={budget.monthlyBurn} disabled={readOnly} onChange={(e) => setBurn(e.target.value)} className="w-full"
              />
            </Field>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                <Clock className="h-3.5 w-3.5" /> Runway
              </div>
              <div className="text-2xl font-extrabold text-slate-100">
                {budget.monthlyBurn > 0 ? `${runway} mo` : '∞'}
              </div>
              <div className="text-xs text-slate-500">
                at {m(budget.monthlyBurn)}/mo. {bp.economics.breakeven !== '—' && runway < bp.economics.breakeven && budget.monthlyBurn > 0
                  ? '⚠ Shorter than projected break-even.'
                  : 'Covers you to break-even.'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Validation scorecard */}
      <Card strong>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
            <h2 className="font-semibold text-slate-100">Validation Scorecard</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-slate-400">Validated</div>
              <div className="text-lg font-bold text-emerald-300">{valScore}%</div>
            </div>
            {!readOnly && <Button variant="subtle" icon={RotateCcw} onClick={resetValidation}>Reset</Button>}
          </div>
        </div>
        <ProgressBar value={valScore} className="mb-5" />

        <div className="space-y-3">
          {validation.map((v) => (
            <div key={v.key} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{v.label}</div>
                    <div className="text-xs text-slate-500">{v.question}</div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {VALIDATION_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={readOnly}
                      onClick={() => setValidation(v.key, { status: s })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                        v.status === s ? STATUS_ACTIVE[s] : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <StatusDot status={s} active={v.status === s} />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={v.evidence || ''}
                disabled={readOnly}
                onChange={(e) => setValidation(v.key, { evidence: e.target.value })}
                placeholder="Evidence — interviews done, pre-sales, signups, data…"
                rows={1}
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-400/50 disabled:opacity-60"
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Your validation score feeds the founder-readiness gauge on the Dashboard — evidence beats optimism.
        </p>
      </Card>
    </div>
  )
}

function StatusDot({ status, active }) {
  const map = {
    untested: 'bg-slate-400',
    testing: 'bg-amber-400',
    validated: 'bg-emerald-400',
    invalidated: 'bg-rose-400',
  }
  return <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${map[status]} ${active ? '' : 'opacity-50'}`} />
}
