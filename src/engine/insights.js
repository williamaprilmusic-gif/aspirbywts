// ============================================================================
//  Aspir by WTS — Momentum & Digest Insights
//  Derives a "founder readiness" score, next actions, and a weekly digest
//  from the active blueprint, roadmap progress, and saved prospects.
// ============================================================================

export function roadmapStats(bp) {
  if (!bp) return { done: 0, total: 0, pct: 0 }
  const tasks = (bp.roadmap || []).flatMap((p) => p.tasks || [])
  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

// Readiness blends fit, execution, validation, pipeline activity, reflection
export function readinessScore(bp, prospects = []) {
  if (!bp) return 0
  const { pct } = roadmapStats(bp)
  const mine = prospects.filter((p) => p.blueprintId === bp.id)
  const contacted = mine.filter((p) => p.status !== 'Saved').length
  const won = mine.filter((p) => p.status === 'Won').length

  const fitComponent = bp.fitScore * 0.3 // up to 30
  const execComponent = pct * 0.3 // up to 30
  const valComponent = validationScoreFor(bp) * 0.2 // up to 20
  const pipelineComponent = Math.min(12, mine.length * 1.5 + contacted * 2 + won * 4) // up to 12
  const reflectionComponent = Math.min(8, ((bp.intake.pastWins || '').length > 15 ? 4 : 0) + ((bp.intake.pastFailures || '').length > 15 ? 4 : 0))

  return Math.round(Math.min(100, fitComponent + execComponent + valComponent + pipelineComponent + reflectionComponent))
}

// local import-light helper to avoid a hard dependency cycle
function validationScoreFor(bp) {
  const v = bp.validation
  if (!v || !v.length) return 0
  const w = { validated: 100, testing: 45, untested: 0, invalidated: 0 }
  return Math.round(v.reduce((s, x) => s + (w[x.status] ?? 0), 0) / v.length)
}

export function readinessBand(score) {
  if (score >= 80) return { label: 'Launch-ready', color: 'emerald' }
  if (score >= 60) return { label: 'Building momentum', color: 'violet' }
  if (score >= 40) return { label: 'Finding footing', color: 'amber' }
  return { label: 'Just getting started', color: 'rose' }
}

// The next few concrete moves: unchecked roadmap tasks in phase order
export function nextActions(bp, limit = 3) {
  if (!bp) return []
  const out = []
  for (const phase of bp.roadmap || []) {
    for (const t of phase.tasks || []) {
      if (!t.done) {
        out.push({ phase: phase.title, window: phase.window, text: t.text, phaseId: phase.id, taskId: t.id })
        if (out.length >= limit) return out
      }
    }
  }
  return out
}

export function topProspects(bp, prospects = [], limit = 3) {
  const mine = prospects.filter((p) => !bp || p.blueprintId === bp.id)
  const open = mine.filter((p) => p.status !== 'Won' && p.status !== 'Lost')
  return open.sort((a, b) => (b.fit || 0) - (a.fit || 0)).slice(0, limit)
}

export function pipelineFunnel(prospects = [], blueprintId = null) {
  const mine = blueprintId ? prospects.filter((p) => p.blueprintId === blueprintId) : prospects
  const STATUSES = ['Saved', 'Contacted', 'Replied', 'Won', 'Lost']
  const counts = {}
  STATUSES.forEach((s) => (counts[s] = mine.filter((p) => p.status === s).length))
  return { counts, total: mine.length, statuses: STATUSES }
}
