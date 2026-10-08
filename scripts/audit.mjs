// ============================================================================
//  Aspir by WTS — Full audit (engine + invariants)
//  Run with:  npm run audit   (or: node scripts/audit.mjs)
//  Exits non-zero if any invariant fails, so it can gate CI / a build step.
//  Pair with `npm run build` for a complete check (compile + logic).
// ============================================================================

import { generateBlueprint, BUSINESS_MODELS, CURRENCIES } from '../src/engine/blueprintEngine.js'
import {
  defaultBudget, budgetStats, roadmapGating, phaseStatus, phaseDates,
  defaultValidation, validationScore,
} from '../src/engine/execution.js'
import { computeScenario, defaultScenario } from '../src/engine/scenario.js'
import { readinessScore, nextActions, pipelineFunnel, roadmapStats } from '../src/engine/insights.js'
import { generateLeads, leadsToCSV } from '../src/engine/leadFinder.js'
import { generateOutreach } from '../src/engine/outreach.js'
import { generateCompetitors } from '../src/engine/competitors.js'
import { encodeBlueprint, decodeBlueprint } from '../src/engine/share.js'
import {
  EVAL_DIMENSIONS, EVAL_QUESTIONS, defaultEvalAnswers, scoreEvaluation, recommendations, evaluationToMarkdown,
} from '../src/engine/evaluation.js'
import { buildBackup, parseBackup, mergeBy } from '../src/engine/backup.js'
import { attentionItems, getBudget } from '../src/engine/execution.js'
import { blueprintToMarkdown } from '../src/engine/exporters.js'
import { TECH_FOUNDER_DEMO, CONSULTANT_DEMO, EMPTY_INTAKE } from '../src/engine/presets.js'

let fails = 0
let checks = 0
const assert = (cond, msg) => {
  checks++
  if (!cond) {
    console.log('  ✗ FAIL:', msg)
    fails++
  }
}

// share.js uses btoa/atob — polyfill for Node if needed
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64')
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary')
}

console.log('Running Aspir full audit…\n')

// --- 1. Blueprint generation across every model + currency ---------------
for (const model of BUSINESS_MODELS.map((m) => m.id)) {
  for (const currency of Object.keys(CURRENCIES)) {
    const bp = generateBlueprint({ ...EMPTY_INTAKE, targetModel: model, currency })
    assert(bp && bp.id, `blueprint generates for ${model}/${currency}`)
    assert(bp.fitScore >= 0 && bp.fitScore <= 100, `${model} fit in 0–100`)
    assert(typeof bp.economics.breakeven === 'number', `${model} breakeven numeric`)
    assert(bp.economics.monthlyDeals.length === 12, `${model} has 12 months`)
    assert(bp.roadmap.length === 4, `${model} has 4 roadmap phases`)
    assert(typeof blueprintToMarkdown(bp) === 'string', `${model} exports markdown`)
  }
}

// --- 2. Capital allocator -------------------------------------------------
for (const model of BUSINESS_MODELS.map((m) => m.id)) {
  const bp = generateBlueprint({ ...EMPTY_INTAKE, targetModel: model, capital: 10000 })
  const bud = defaultBudget(bp)
  const sum = bud.allocations.reduce((s, a) => s + a.pct, 0)
  assert(sum === 100, `budget ${model} sums to 100% (got ${sum})`)
  assert(bud.monthlyBurn >= 1, `budget ${model} burn >= 1`)
  assert(budgetStats(bud).runway >= 0, `budget ${model} runway >= 0`)
}
const zeroBud = defaultBudget(generateBlueprint({ ...EMPTY_INTAKE, capital: 0 }))
assert(zeroBud.monthlyBurn >= 1, 'zero-capital burn >= 1 (no divide-by-zero)')

// --- 3. Roadmap gating + dates -------------------------------------------
const bpg = generateBlueprint(TECH_FOUNDER_DEMO)
const g1 = roadmapGating(bpg.roadmap)
assert(g1[bpg.roadmap[0].id].locked === false, 'phase 1 starts unlocked')
assert(g1[bpg.roadmap[1].id].locked === true, 'phase 2 starts locked')
bpg.roadmap[0].tasks.forEach((t) => (t.done = true))
assert(roadmapGating(bpg.roadmap)[bpg.roadmap[1].id].locked === false, 'phase 2 unlocks after phase 1 done')
const pd = phaseDates('2026-01-01', 'p3')
assert(pd.start && pd.end && pd.end > pd.start, 'phase dates ordered')
assert(phaseStatus('', bpg.roadmap[1]).label.length > 0, 'phase status renders without a start date')

// --- 4. Validation scorecard ---------------------------------------------
const val = defaultValidation(bpg)
assert(validationScore(val) === 0, 'validation starts at 0%')
val[0].status = 'validated'
val[1].status = 'testing'
assert(validationScore(val) > 0 && validationScore(val) <= 100, 'validation score in range after updates')

// --- 5. Scenario engine ---------------------------------------------------
const sc = computeScenario(bpg, defaultScenario(bpg))
assert(sc.year1Gross > 0, 'scenario base revenue > 0')
assert(sc.monthlyDeals.length === 12, 'scenario has 12 months')
const scZero = computeScenario(bpg, { ...defaultScenario(bpg), growthMult: 0, churnMonthly: 0.1 })
assert(scZero.year1Gross >= 0, 'scenario non-negative at zero growth')

// --- 6. Insights ----------------------------------------------------------
assert(readinessScore(bpg, []) >= 0 && readinessScore(bpg, []) <= 100, 'readiness in 0–100')
assert(Array.isArray(nextActions(bpg, 3)), 'nextActions returns array')
assert(pipelineFunnel([], bpg.id).total === 0, 'empty funnel totals 0')
assert(roadmapStats(bpg).pct >= 0, 'roadmap stats computed')

// --- 7. Lead finder + outreach -------------------------------------------
const leads = generateLeads({ city: 'Cape Town', country: 'South Africa', industry: 'logistics', domain: 'supply chain', targetModel: 'b2b-saas', count: 10 })
assert(leads.length === 10, 'finder returns requested count')
assert(leads.every((l) => l.fit >= 0 && l.fit <= 100), 'lead fit scores in range')
assert(leads[0].fit >= leads[leads.length - 1].fit, 'leads sorted by fit desc')
// determinism
const leads2 = generateLeads({ city: 'Cape Town', country: 'South Africa', industry: 'logistics', domain: 'supply chain', targetModel: 'b2b-saas', count: 10 })
assert(JSON.stringify(leads) === JSON.stringify(leads2), 'finder is deterministic')
assert(typeof leadsToCSV(leads) === 'string', 'leads export to CSV')
const msg = generateOutreach({ prospect: leads[0], blueprint: bpg })
assert(msg.email && msg.dm && msg.followUp, 'outreach generates all variants')

// --- 8. Competitors -------------------------------------------------------
const comp = generateCompetitors(bpg)
assert(comp.competitors.some((c) => c.isYou), 'competitor map includes "you"')
assert(comp.competitors.every((c) => c.price >= 0 && c.price <= 1 && c.focus >= 0 && c.focus <= 1), 'competitor coords in 0–1')

// --- 9. Share round-trip --------------------------------------------------
const enc = encodeBlueprint(bpg)
const dec = decodeBlueprint(enc)
assert(dec && dec.id === bpg.id, 'share link round-trips a blueprint')
assert(decodeBlueprint('not-valid-base64!!') === null, 'bad share payload decodes to null (no throw)')

// --- 10. Business evaluation ---------------------------------------------
assert(EVAL_DIMENSIONS.length === 8, 'evaluation has 8 dimensions')
assert(EVAL_QUESTIONS.length === EVAL_DIMENSIONS.reduce((s, d) => s + d.questions.length, 0), 'question index matches dimensions')
assert(EVAL_QUESTIONS.every((q) => q.fix && q.text), 'every eval question has text + a fix')
const qIds = EVAL_QUESTIONS.map((q) => q.id)
assert(new Set(qIds).size === qIds.length, 'eval question ids are unique')
const neutral = scoreEvaluation(defaultEvalAnswers())
assert(neutral.overall === 60, `neutral baseline scores 60 (got ${neutral.overall})`)
assert(neutral.dimensions.length === 8, 'eval scores all 8 dimensions')
const allTop = {}
EVAL_QUESTIONS.forEach((q) => (allTop[q.id] = 5))
assert(scoreEvaluation(allTop).overall === 100, 'all-5 scores 100%')
assert(recommendations(allTop).length === 0, 'no recommendations when all excellent')
const allLow = {}
EVAL_QUESTIONS.forEach((q) => (allLow[q.id] = 1))
const lowRes = scoreEvaluation(allLow)
assert(lowRes.overall === 20, `all-1 scores 20% (got ${lowRes.overall})`)
assert(lowRes.weaknesses.length > 0, 'weak areas surfaced when all low')
assert(recommendations(allLow).every((r) => r.severity === 'High'), 'all-low recs are High priority')
assert(scoreEvaluation({}).overall === 60, 'empty answers fall back to neutral')
assert(typeof evaluationToMarkdown(allLow) === 'string', 'evaluation exports markdown')

// --- 11. Backup / restore round-trip -------------------------------------
const backup = buildBackup({ savedBlueprints: [bpg], prospects: [{ key: 'k1', name: 'Acme', status: 'Saved' }], evaluation: { 'product-1': 5 }, evalSnapshots: [] })
assert(backup.app === 'aspir-by-wts' && backup.version >= 1, 'backup has app + version')
const parsed = parseBackup(JSON.stringify(backup))
assert(parsed.ok && parsed.data.blueprints.length === 1, 'backup round-trips')
assert(parseBackup('{not json').ok === false, 'invalid JSON rejected')
assert(parseBackup(JSON.stringify({ app: 'something-else' })).ok === false, 'foreign file rejected')
assert(parseBackup(JSON.stringify({ app: 'aspir-by-wts', blueprints: [] })).ok === false, 'empty backup rejected')
const merged = mergeBy([{ id: 'a' }, { id: 'b' }], [{ id: 'b', x: 1 }, { id: 'c' }], 'id')
assert(merged.length === 3 && merged.find((x) => x.id === 'b').x === 1, 'mergeBy dedupes + incoming wins')

// --- 12. Attention feed ---------------------------------------------------
assert(attentionItems(null).length === 0, 'attention empty without blueprint')
const freshBp = generateBlueprint(TECH_FOUNDER_DEMO)
const attn = attentionItems(freshBp, { prospects: [], savedBlueprints: [] })
assert(Array.isArray(attn) && attn.length > 0, 'attention surfaces items for a new unsaved blueprint')
assert(attn.some((a) => a.kind === 'save'), 'flags unsaved blueprint')
assert(attn.some((a) => a.kind === 'date'), 'flags missing start date')
assert(attn.every((a) => a.tab && a.text && a.severity), 'attention items are well-formed')
assert(attn.length <= 6, 'attention capped at 6')
// a fully-handled blueprint should have fewer nags
const handled = { ...freshBp, startDate: '2999-01-01' }
handled.validation = freshBp.validation // undefined ok
const attn2 = attentionItems(handled, { prospects: [], savedBlueprints: [handled] })
assert(!attn2.some((a) => a.kind === 'save'), 'saved blueprint not flagged for saving')

// --- summary --------------------------------------------------------------
console.log(`\n${checks} checks run.`)
if (fails === 0) {
  console.log('✅ ALL PASS')
  process.exit(0)
} else {
  console.log(`❌ ${fails} FAILURE(S)`)
  process.exit(1)
}
