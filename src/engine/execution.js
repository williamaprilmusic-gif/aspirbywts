// ============================================================================
//  Aspir by WTS — Execution layer helpers
//  Capital allocation / runway, roadmap milestone dating + gating, and the
//  validation scorecard. All pure + deterministic; state lives on the
//  blueprint so it persists and travels with saves/shares.
// ============================================================================

// ---------------------------------------------------------------------------
//  Capital allocator
// ---------------------------------------------------------------------------
const BUDGET_TEMPLATES = {
  'b2b-saas': [
    { key: 'tech', label: 'Tech & tooling', pct: 25 },
    { key: 'marketing', label: 'Marketing & acquisition', pct: 30 },
    { key: 'legal', label: 'Legal & setup', pct: 10 },
    { key: 'product', label: 'Product & build', pct: 20 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 15 },
  ],
  'micro-saas': [
    { key: 'tech', label: 'Tech & tooling', pct: 25 },
    { key: 'marketing', label: 'Marketing & acquisition', pct: 35 },
    { key: 'legal', label: 'Legal & setup', pct: 8 },
    { key: 'product', label: 'Product & build', pct: 17 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 15 },
  ],
  ecommerce: [
    { key: 'product', label: 'Inventory & product', pct: 40 },
    { key: 'marketing', label: 'Marketing & acquisition', pct: 30 },
    { key: 'tech', label: 'Store & tooling', pct: 10 },
    { key: 'legal', label: 'Legal & setup', pct: 5 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 15 },
  ],
  agency: [
    { key: 'marketing', label: 'Marketing & outreach', pct: 30 },
    { key: 'tech', label: 'Tools & software', pct: 15 },
    { key: 'product', label: 'Contractors / delivery', pct: 25 },
    { key: 'legal', label: 'Legal & setup', pct: 10 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 20 },
  ],
  consulting: [
    { key: 'marketing', label: 'Authority & outreach', pct: 35 },
    { key: 'tech', label: 'Tools & software', pct: 15 },
    { key: 'product', label: 'Content & materials', pct: 15 },
    { key: 'legal', label: 'Legal & setup', pct: 10 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 25 },
  ],
  'digital-products': [
    { key: 'product', label: 'Production & content', pct: 30 },
    { key: 'marketing', label: 'Marketing & launch', pct: 35 },
    { key: 'tech', label: 'Platform & tooling', pct: 15 },
    { key: 'legal', label: 'Legal & setup', pct: 5 },
    { key: 'reserve', label: 'Reserve / buffer', pct: 15 },
  ],
}

// Rough monthly fixed cost as a fraction of capital, per model
const BURN_FRACTION = {
  'b2b-saas': 0.12,
  'micro-saas': 0.1,
  ecommerce: 0.14,
  agency: 0.1,
  consulting: 0.08,
  'digital-products': 0.1,
}

export function defaultBudget(bp) {
  const model = bp.intake?.targetModel || 'b2b-saas'
  const capital = Math.max(0, Number(bp.intake?.capital) || 0)
  const template = BUDGET_TEMPLATES[model] || BUDGET_TEMPLATES['b2b-saas']
  const monthlyBurn = Math.max(1, Math.round(capital * (BURN_FRACTION[model] || 0.1)))
  return {
    capital,
    monthlyBurn,
    allocations: template.map((t) => ({ ...t })),
  }
}

export function budgetStats(budget) {
  const totalPct = budget.allocations.reduce((s, a) => s + Number(a.pct || 0), 0)
  const runway = budget.monthlyBurn > 0 ? Math.floor(budget.capital / budget.monthlyBurn) : 0
  return { totalPct, runway, balanced: totalPct === 100 }
}

// ---------------------------------------------------------------------------
//  Milestones: dates + phase gating
// ---------------------------------------------------------------------------
// Each phase window maps to a day offset from the start date.
const PHASE_END_DAYS = { p1: 15, p2: 30, p3: 60, p4: 90 }
const PHASE_START_DAYS = { p1: 1, p2: 16, p3: 31, p4: 61 }

export function addDays(dateStr, days) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d
}

export function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function phaseDates(startDate, phaseId) {
  if (!startDate) return { start: null, end: null }
  return {
    start: addDays(startDate, (PHASE_START_DAYS[phaseId] || 1) - 1),
    end: addDays(startDate, PHASE_END_DAYS[phaseId] || 90),
  }
}

export function phaseProgress(phase) {
  const done = phase.tasks.filter((t) => t.done).length
  return phase.tasks.length ? done / phase.tasks.length : 0
}

// A phase is "unlocked" once the previous phase is >= 60% complete (soft gate).
export function roadmapGating(roadmap) {
  const map = {}
  roadmap.forEach((phase, i) => {
    if (i === 0) {
      map[phase.id] = { locked: false }
    } else {
      const prev = roadmap[i - 1]
      map[phase.id] = { locked: phaseProgress(prev) < 0.6 }
    }
  })
  return map
}

// On-track status for a phase given today's date
export function phaseStatus(startDate, phase) {
  const prog = phaseProgress(phase)
  if (prog >= 1) return { label: 'Complete', color: 'emerald' }
  if (!startDate) return { label: `${Math.round(prog * 100)}%`, color: 'slate' }
  const { end } = phaseDates(startDate, phase.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (end && today > end) return { label: 'Behind', color: 'rose' }
  // within window
  return { label: 'On track', color: 'violet' }
}

// ---------------------------------------------------------------------------
//  Validation scorecard
// ---------------------------------------------------------------------------
const VALIDATION_TEMPLATES = {
  default: [
    { key: 'demand', label: 'Demand', question: 'Do target customers actually have this pain and want it solved?' },
    { key: 'pricing', label: 'Pricing', question: 'Will they pay your price for the core offer?' },
    { key: 'channel', label: 'Channel', question: 'Can you reach them repeatably through your chosen channel?' },
    { key: 'retention', label: 'Retention / repeat', question: 'Do customers stay, repeat, or refer after the first purchase?' },
  ],
}

export function defaultValidation(bp) {
  const items = VALIDATION_TEMPLATES.default
  return items.map((it) => ({ ...it, status: 'untested', evidence: '' }))
}

const STATUS_WEIGHT = { validated: 100, testing: 45, untested: 0, invalidated: 0 }

export function validationScore(validation = []) {
  if (!validation.length) return 0
  const total = validation.reduce((s, v) => s + (STATUS_WEIGHT[v.status] ?? 0), 0)
  return Math.round(total / validation.length)
}

export const VALIDATION_STATUSES = ['untested', 'testing', 'validated', 'invalidated']
export const VALIDATION_STATUS_COLOR = {
  untested: 'slate',
  testing: 'amber',
  validated: 'emerald',
  invalidated: 'rose',
}

// Lazy getters so older saved blueprints (without these fields) still work
export function getBudget(bp) {
  return bp.budget || defaultBudget(bp)
}
export function getValidation(bp) {
  return bp.validation && bp.validation.length ? bp.validation : defaultValidation(bp)
}

// ---------------------------------------------------------------------------
//  Attention feed — ranked "what needs you" items for the Dashboard
// ---------------------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000

export function attentionItems(bp, { prospects = [], savedBlueprints = [] } = {}) {
  if (!bp) return []
  const items = []
  const push = (severity, kind, text, tab) => items.push({ severity, kind, text, tab })

  // Unsaved blueprint
  if (!savedBlueprints.some((b) => b.id === bp.id)) {
    push('medium', 'save', 'Save this blueprint so it persists across sessions.', 'blueprint')
  }

  // Milestones
  if (!bp.startDate) {
    push('medium', 'date', 'Set a launch start date to activate milestone tracking.', 'roadmap')
  } else {
    bp.roadmap.forEach((phase) => {
      if (phaseStatus(bp.startDate, phase).label === 'Behind') {
        push('high', 'behind', `${phase.title} is behind schedule — catch up or re-plan.`, 'roadmap')
      }
    })
  }

  // Runway vs break-even
  const budget = getBudget(bp)
  const { runway } = budgetStats(budget)
  if (budget.monthlyBurn > 0 && typeof bp.economics.breakeven === 'number' && runway < bp.economics.breakeven) {
    push('high', 'runway', `Runway (${runway} mo) is shorter than projected break-even (month ${bp.economics.breakeven}).`, 'planner')
  }

  // Untested validation
  const untested = getValidation(bp).filter((v) => v.status === 'untested').length
  if (untested > 0) {
    push('medium', 'validation', `${untested} key assumption${untested === 1 ? '' : 's'} still untested — validate before you scale.`, 'planner')
  }

  // Pipeline
  const mine = prospects.filter((p) => p.blueprintId === bp.id)
  if (mine.length === 0) {
    push('medium', 'prospects', 'No saved prospects yet — find your first targets.', 'finder')
  } else {
    const now = Date.now()
    const stale = mine.filter(
      (p) => ['Saved', 'Contacted', 'Replied'].includes(p.status) && p.savedAt && now - new Date(p.savedAt).getTime() > 7 * DAY,
    ).length
    if (stale > 0) push('medium', 'stale', `${stale} prospect${stale === 1 ? '' : 's'} with no movement in 7+ days — follow up.`, 'pipeline')
  }

  const rank = { high: 0, medium: 1, low: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 6)
}
