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

// --- summary --------------------------------------------------------------
console.log(`\n${checks} checks run.`)
if (fails === 0) {
  console.log('✅ ALL PASS')
  process.exit(0)
} else {
  console.log(`❌ ${fails} FAILURE(S)`)
  process.exit(1)
}
