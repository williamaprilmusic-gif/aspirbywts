import React, { useEffect, useRef, useState } from 'react'
import { burstConfetti } from '../utils/confetti.js'
import {
  Target, Plus, Trash2, Check, CalendarClock, Users, DollarSign, Map, ShieldCheck, Hash, Trophy,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Card, Badge, Button, EmptyState, ProgressBar, Field, TextInput, Select } from '../components/ui.jsx'
import { money } from '../engine/blueprintEngine.js'
import { GOAL_KINDS, GOAL_KIND_LIST, defaultGoal, computeGoal, goalsSummary } from '../engine/goals.js'

const KIND_ICON = {
  customers: Users,
  revenue: DollarSign,
  roadmap: Map,
  validation: ShieldCheck,
  custom: Hash,
  date: CalendarClock,
}

export default function Goals() {
  const { activeBlueprint: bp, updateActiveBlueprint, prospects, setTab, readOnly, notify } = useApp()
  const [newKind, setNewKind] = useState('customers')

  if (!bp) {
    return (
      <EmptyState icon={Target} title="No goals yet" action={<Button className="mt-2" onClick={() => setTab('intake')}>Start intake</Button>}>
        Generate a blueprint, then set concrete targets here — customers, revenue, a launch date — and watch progress
        pull automatically from your pipeline, roadmap, and validation.
      </EmptyState>
    )
  }

  const goals = bp.goals || []
  const ctx = { bp, prospects }
  const summary = goalsSummary(goals, ctx)

  // Celebrate when a goal newly hits 100%
  const achievedRef = useRef(null)
  useEffect(() => {
    const nowAchieved = new Set(
      goals.filter((g) => {
        const c = computeGoal(g, ctx)
        return c.done || c.pct >= 100
      }).map((g) => g.id),
    )
    if (achievedRef.current !== null) {
      for (const id of nowAchieved) {
        if (!achievedRef.current.has(id)) {
          burstConfetti()
          break
        }
      }
    }
    achievedRef.current = nowAchieved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(goals), prospects])

  const setGoals = (updater) =>
    updateActiveBlueprint((prev) => ({ ...prev, goals: typeof updater === 'function' ? updater(prev.goals || []) : updater }))

  const addGoal = () => {
    const g = defaultGoal(newKind)
    g.label = GOAL_KINDS[newKind].label
    setGoals((prev) => [...(prev || []), g])
    notify('Goal added')
  }
  const patchGoal = (id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id))

  return (
    <div className="mx-auto max-w-5xl animate-fade-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge color="emerald" className="mb-2"><Target className="h-3 w-3" /> Scoreboard</Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">Goals & Targets</h1>
          <p className="mt-1 text-sm text-slate-400">Set the numbers that matter for {bp.concept.productName} and track them in one place.</p>
        </div>
        {goals.length > 0 && (
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
            <div className="text-center">
              <div className="text-xl font-extrabold text-emerald-300">{summary.avgPct}%</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Avg progress</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-xl font-extrabold text-slate-100">{summary.achieved}/{summary.count}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Achieved</div>
            </div>
          </div>
        )}
      </div>

      {/* Add goal */}
      {!readOnly && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Add a target" hint={GOAL_KINDS[newKind].hint}>
              <Select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
                options={GOAL_KIND_LIST.map((k) => ({ value: k, label: GOAL_KINDS[k].label }))}
              />
            </Field>
            <Button icon={Plus} onClick={addGoal}>Add goal</Button>
          </div>
        </Card>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No targets set yet">
          Add your first target above — e.g. <span className="text-emerald-300">10 customers won</span>,{' '}
          <span className="text-emerald-300">$10k revenue</span>, or a <span className="text-emerald-300">launch date</span>.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const c = computeGoal(g, ctx)
            const Icon = KIND_ICON[g.kind] || Target
            const achieved = c.done || c.pct >= 100
            const meta = GOAL_KINDS[g.kind]
            return (
              <Card key={g.id} glow className={achieved ? 'border-emerald-500/40' : c.overdue ? 'border-rose-500/40' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${achieved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-emerald-300'}`}>
                      {achieved ? <Trophy className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      {readOnly ? (
                        <h3 className="font-semibold text-slate-100">{g.label || meta.label}</h3>
                      ) : (
                        <input
                          value={g.label}
                          onChange={(e) => patchGoal(g.id, { label: e.target.value })}
                          placeholder={meta.label}
                          className="w-full bg-transparent font-semibold text-slate-100 outline-none placeholder:text-slate-500"
                        />
                      )}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge color={meta.auto ? 'violet' : 'slate'}>{meta.auto ? 'auto' : 'manual'}</Badge>
                        {c.overdue && <Badge color="rose">overdue</Badge>}
                        {achieved && <Badge color="emerald">achieved</Badge>}
                      </div>
                    </div>
                  </div>
                  {!readOnly && (
                    <button onClick={() => removeGoal(g.id)} className="shrink-0 text-slate-600 transition hover:text-rose-400" title="Remove goal" aria-label={`Remove goal: ${g.label || meta.label}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    {g.kind === 'date' ? (
                      <>
                        <span className={c.overdue ? 'text-rose-300' : 'text-slate-300'}>{c.valueText}</span>
                        <span className="text-slate-400">by {c.targetText}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-100">
                          {meta.money ? money(bp.currency, c.value) : c.value}
                          {meta.percent ? '%' : ''}
                          <span className="font-normal text-slate-500"> / {meta.money ? money(bp.currency, c.target) : c.target}{meta.percent ? '%' : ''}</span>
                        </span>
                        <span className="text-emerald-300">{c.pct}%</span>
                      </>
                    )}
                  </div>
                  <ProgressBar value={c.pct} />
                </div>

                {/* Editors */}
                {!readOnly && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {g.kind === 'date' ? (
                      <Field label="Target date" className="sm:col-span-2">
                        <input
                          type="date"
                          value={g.targetDate}
                          onChange={(e) => patchGoal(g.id, { targetDate: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/50 [color-scheme:dark]"
                        />
                      </Field>
                    ) : (
                      <>
                        {!meta.auto && !meta.percent && (
                          <Field label={meta.money ? 'Current revenue' : 'Current value'}>
                            <TextInput type="number" value={g.current} onChange={(e) => patchGoal(g.id, { current: Number(e.target.value) })} />
                          </Field>
                        )}
                        {!meta.percent && (
                          <Field label="Target">
                            <TextInput type="number" value={g.target} onChange={(e) => patchGoal(g.id, { target: Number(e.target.value) })} />
                          </Field>
                        )}
                        {meta.auto && (
                          <div className="sm:col-span-2 text-xs text-slate-500">{meta.hint}</div>
                        )}
                      </>
                    )}
                    <div className="sm:col-span-2">
                      <button
                        onClick={() => patchGoal(g.id, { done: !g.done })}
                        className={`flex items-center gap-1.5 text-xs font-medium ${g.done ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        <Check className="h-3.5 w-3.5" /> {g.done ? 'Marked achieved — undo' : 'Mark achieved'}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
