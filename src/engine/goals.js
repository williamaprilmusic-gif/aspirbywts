// ============================================================================
//  Aspir by WTS — Goal & Target Tracker
//  Concrete founder targets whose progress auto-pulls from the pipeline,
//  roadmap, and validation where possible, or is tracked manually otherwise.
//  Goals live on the blueprint so they persist and travel with it.
// ============================================================================

import { roadmapStats } from './insights.js'
import { getValidation } from './execution.js'

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export const GOAL_KINDS = {
  customers: { label: 'Customers won', auto: true, unit: 'customers', defaultTarget: 10, hint: 'Counts prospects marked Won in your pipeline.' },
  revenue: { label: 'Revenue', auto: false, money: true, defaultTarget: 10000, hint: 'Update your current revenue manually.' },
  roadmap: { label: 'Roadmap completion', auto: true, percent: true, defaultTarget: 100, hint: 'Auto-tracks your 90-day roadmap.' },
  validation: { label: 'Assumptions validated', auto: true, percent: true, defaultTarget: 100, hint: 'Auto-tracks your validation scorecard.' },
  custom: { label: 'Custom metric', auto: false, defaultTarget: 100, hint: 'Track any number you care about.' },
  date: { label: 'Hit a date', date: true, hint: 'A countdown to a launch or milestone date.' },
}

export const GOAL_KIND_LIST = Object.keys(GOAL_KINDS)

let seq = 0
export function defaultGoal(kind = 'customers') {
  const meta = GOAL_KINDS[kind]
  return {
    id: `goal_${Date.now()}_${seq++}`,
    kind,
    label: '',
    target: meta.percent ? 100 : meta.defaultTarget || 0,
    current: 0,
    unit: meta.unit || '',
    targetDate: '',
    done: false,
    createdAt: new Date().toISOString(),
  }
}

export function computeGoal(goal, { bp, prospects = [] }) {
  const meta = GOAL_KINDS[goal.kind] || GOAL_KINDS.custom

  if (goal.kind === 'date') {
    const now = Date.now()
    const start = new Date(goal.createdAt).getTime()
    const end = new Date(goal.targetDate).getTime()
    const valid = !isNaN(end)
    const total = valid ? Math.max(1, end - start) : 1
    const elapsed = valid ? now - start : 0
    const pct = valid ? clamp(Math.round((elapsed / total) * 100), 0, 100) : 0
    const daysLeft = valid ? Math.ceil((end - now) / (24 * 60 * 60 * 1000)) : null
    const overdue = valid && daysLeft < 0 && !goal.done
    return {
      meta,
      kind: goal.kind,
      pct: goal.done ? 100 : pct,
      done: !!goal.done,
      overdue,
      daysLeft,
      valueText: goal.done ? 'Achieved' : !valid ? 'Set a date' : daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`,
      targetText: valid ? new Date(goal.targetDate).toLocaleDateString() : '—',
    }
  }

  let value
  if (goal.kind === 'customers') value = prospects.filter((p) => p.blueprintId === bp.id && p.status === 'Won').length
  else if (goal.kind === 'roadmap') value = roadmapStats(bp).pct
  else if (goal.kind === 'validation') value = validationScore(getValidation(bp))
  else value = Number(goal.current) || 0

  const target = meta.percent ? 100 : Number(goal.target) || 0
  const pct = target > 0 ? clamp(Math.round((value / target) * 100), 0, 100) : value > 0 ? 100 : 0
  const done = goal.done || pct >= 100
  return { meta, kind: goal.kind, value, target, pct, done, auto: meta.auto }
}

export function goalsSummary(goals = [], ctx) {
  if (!goals.length) return { count: 0, achieved: 0, avgPct: 0 }
  const computed = goals.map((g) => computeGoal(g, ctx))
  const achieved = computed.filter((c) => c.done || c.pct >= 100).length
  const avgPct = Math.round(computed.reduce((s, c) => s + c.pct, 0) / computed.length)
  return { count: goals.length, achieved, avgPct }
}

// local to avoid an import cycle with execution.js
function validationScore(validation = []) {
  if (!validation.length) return 0
  const w = { validated: 100, testing: 45, untested: 0, invalidated: 0 }
  return Math.round(validation.reduce((s, x) => s + (w[x.status] ?? 0), 0) / validation.length)
}
