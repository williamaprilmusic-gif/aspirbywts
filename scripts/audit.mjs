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
import { buildOverpassQuery, mapElements, companyLinks, industryKeywords, modelTargets } from '../src/engine/liveFinder.js'
import { generateCompetitors } from '../src/engine/competitors.js'
import { encodeBlueprint, decodeBlueprint } from '../src/engine/share.js'
import {
  EVAL_DIMENSIONS, EVAL_QUESTIONS, defaultEvalAnswers, scoreEvaluation, recommendations, evaluationToMarkdown,
} from '../src/engine/evaluation.js'
import { buildBackup, parseBackup, mergeBy } from '../src/engine/backup.js'
import { attentionItems, getBudget } from '../src/engine/execution.js'
import { GOAL_KIND_LIST, defaultGoal, computeGoal, goalsSummary } from '../src/engine/goals.js'
import { getStartedSteps, nextStep } from '../src/engine/guide.js'
import { generatePromptPack, promptPackToMarkdown } from '../src/engine/prompts.js'
import { withCommas, timeAgo } from '../src/utils/format.js'
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

// --- 7. Lead finder (real-search launchpad) + outreach -------------------
const res = generateLeads({ city: 'Cape Town', country: 'South Africa', industry: 'logistics', domain: 'supply chain', targetModel: 'b2b-saas', count: 10 })
assert(Array.isArray(res.targets) && res.targets.length > 0 && res.targets.length <= 10, 'finder returns a bounded list of target segments')
assert(res.location === 'Cape Town, South Africa', 'result carries the searched location')
assert(res.targets.every((t) => t.location === 'Cape Town, South Africa'), 'every target shows the searched location')
assert(res.targets.every((t) => t.fit >= 0 && t.fit <= 100), 'relevance scores in range')
assert(res.targets[0].fit >= res.targets[res.targets.length - 1].fit, 'targets sorted by relevance desc')
// Links are REAL, working search URLs anchored to the location
const encCountry = encodeURIComponent('South Africa')
const encCity = encodeURIComponent('Cape Town')
assert(res.targets.every((t) => t.links.google.startsWith('https://www.google.com/search?q=')), 'google links are real search URLs')
assert(res.targets.every((t) => t.links.maps.startsWith('https://www.google.com/maps/search/')), 'maps links are real')
assert(res.targets.every((t) => t.links.linkedin.startsWith('https://www.linkedin.com/search/results/companies/')), 'linkedin links are real')
assert(res.targets.every((t) => t.links.google.includes(encCountry) || t.links.google.includes(encCity)), 'search links include the location')
assert(res.broad && res.broad.google.includes('google.com') && res.broad.linkedin.includes('linkedin.com'), 'broad searches present + real')
// determinism
const res2 = generateLeads({ city: 'Cape Town', country: 'South Africa', industry: 'logistics', domain: 'supply chain', targetModel: 'b2b-saas', count: 10 })
assert(JSON.stringify(res) === JSON.stringify(res2), 'finder is deterministic')
assert(typeof leadsToCSV(res) === 'string' && leadsToCSV(res).includes('google.com'), 'targets export to CSV with real links')
// Location labelling for country-only / city-only / none
assert(generateLeads({ country: 'Kenya', targetModel: 'agency', count: 4 }).location === 'Kenya', 'country-only location label')
assert(generateLeads({ city: 'Austin', targetModel: 'b2b-saas', count: 4 }).location === 'Austin', 'city-only location label')
assert(generateLeads({ targetModel: 'b2b-saas', count: 3 }).location === 'Your region', 'no-location falls back to Your region')
const msg = generateOutreach({ prospect: { ...res.targets[0], name: res.targets[0].title }, blueprint: bpg })
assert(msg.email && msg.dm && msg.followUp, 'outreach generates all variants')

// Live finder pure helpers (no network)
const oq = buildOverpassQuery(-33.9, 18.4, 12000)
assert(oq.includes('around:12000,-33.9,18.4') && oq.includes('out:json'), 'overpass query is well-formed')
const mapped = mapElements(
  [
    { tags: { name: 'Cape Logistics Co', office: 'logistics', website: 'https://capelog.co.za' }, lat: -33.9, lon: 18.4 },
    { tags: { name: 'Table Mountain IT', office: 'it' }, center: { lat: -33.8, lon: 18.5 } },
    { tags: { name: 'Cape Logistics Co', office: 'logistics' } }, // duplicate
    { tags: { office: 'company' } }, // no name → dropped
  ],
  { industry: 'logistics', location: 'Cape Town, South Africa' },
)
assert(mapped.length === 2, 'mapElements dedupes by name and drops unnamed')
assert(mapped[0].name === 'Cape Logistics Co' && mapped[0].relevance === 1, 'industry match ranked first')
assert(mapped.every((c) => c.location === 'Cape Town, South Africa'), 'mapped companies carry the location')
const cl = companyLinks(mapped[0], { city: 'Cape Town', country: 'South Africa' })
assert(cl.website === 'https://capelog.co.za', 'company website used when present')
const cl2 = companyLinks({ name: 'Table Mountain IT', lat: -33.8, lon: 18.5 }, { city: 'Cape Town', country: 'South Africa' })
assert(cl2.website.startsWith('https://www.google.com/search?q=') && cl2.maps.includes('-33.8,18.5'), 'fallback website = search, maps uses coords')

// industryKeywords strips generic stopwords + short tokens
assert(industryKeywords('call centre').length === 1 && industryKeywords('call centre')[0] === 'call', 'generic word "centre" stripped from keywords')
assert(industryKeywords('IT & Services').join(',') === 'it', 'stopwords + "&" split dropped, "it" kept')
assert(industryKeywords('').length === 0, 'empty industry yields no keywords')
// whole-word matching: "call" must NOT match "Shopping Centre"/mall via substring
const mallTest = mapElements(
  [
    { tags: { name: 'Canal Walk Shopping Centre', shop: 'mall' }, lat: -33.8, lon: 18.5 },
    { tags: { name: 'Cape Call Experts', office: 'telecommunication' }, lat: -33.9, lon: 18.4 },
  ],
  { industry: 'call centre', location: 'Cape Town' },
)
assert(mallTest.find((c) => c.name === 'Canal Walk Shopping Centre').relevance === 0, 'mall does not match "call centre" by substring')
assert(mallTest.find((c) => c.name === 'Cape Call Experts').relevance === 1, 'real call company matches "call centre"')

// business model contributes ideal-customer categories that filter companies
assert(modelTargets('agency').includes('restaurant') && modelTargets('b2b-saas').includes('office'), 'model targets map to ideal-customer categories')
assert(modelTargets('').length === 0 && modelTargets('nope').length === 0, 'unknown/empty model yields no targets')
const modelTest = mapElements(
  [
    { tags: { name: 'Harbour Bistro', amenity: 'restaurant' }, lat: -33.9, lon: 18.4 },
    { tags: { name: 'Cape Audit Partners', office: 'accountant' }, lat: -33.8, lon: 18.5 },
  ],
  { model: 'agency', location: 'Cape Town' },
)
assert(modelTest.find((c) => c.name === 'Harbour Bistro').relevance === 1, 'agency model matches a restaurant (ideal customer)')
assert(modelTest.find((c) => c.name === 'Cape Audit Partners').relevance === 0, 'agency model does not match an accountancy office')
const combined = mapElements(
  [{ tags: { name: 'Pixel IT Studio', office: 'it' }, lat: -33.9, lon: 18.4 }],
  { industry: 'it', model: 'b2b-saas', location: 'Cape Town' },
)
assert(combined[0].relevance === 2, 'industry + model matches stack on relevance')
// a shop-targeting model matches ANY shop, even an un-enumerated sub-type
const shopWide = mapElements(
  [
    { tags: { name: 'Cape Union Mart', shop: 'outdoor' }, lat: -33.9, lon: 18.4 },
    { tags: { name: 'WWF South Africa', office: 'ngo' }, lat: -33.9, lon: 18.5 },
  ],
  { model: 'ecommerce', location: 'Cape Town' },
)
assert(shopWide.find((c) => c.name === 'Cape Union Mart').relevance === 1, 'ecommerce matches any shop sub-type')
assert(shopWide.find((c) => c.name === 'WWF South Africa').relevance === 0, 'shop widening does not let an NGO office through')

// Per-model filtering scenarios: each model surfaces its ideal customers and
// drops the rest. A shared sample is run against every model.
const marketSample = [
  { tags: { name: 'Harbour Bistro', amenity: 'restaurant' }, lat: -33.90, lon: 18.40 },
  { tags: { name: 'Gorgeous George Hotel', amenity: 'hotel' }, lat: -33.91, lon: 18.42 },
  { tags: { name: 'Kloof Hairdresser', shop: 'hairdresser' }, lat: -33.92, lon: 18.41 },
  { tags: { name: 'Mr Price Canal Walk', shop: 'clothes' }, lat: -33.89, lon: 18.51 },
  { tags: { name: 'Cape Union Mart', shop: 'outdoor' }, lat: -33.92, lon: 18.42 },
  { tags: { name: 'Faithful Wholesale', shop: 'wholesale' }, lat: -33.95, lon: 18.55 },
  { tags: { name: 'Allan Gray Investment', office: 'financial' }, lat: -33.90, lon: 18.42 },
  { tags: { name: 'Imperial Logistics CT', office: 'logistics' }, lat: -33.93, lon: 18.50 },
  { tags: { name: 'Coega Steel Works', industrial: 'factory' }, lat: -33.94, lon: 18.52 },
  { tags: { name: 'Yoco Software', office: 'it' }, lat: -33.92, lon: 18.43 },
  { tags: { name: 'Workshop17', amenity: 'coworking_space' }, lat: -33.91, lon: 18.42 },
  { tags: { name: 'UCT Business School', amenity: 'university' }, lat: -33.90, lon: 18.41 },
  { tags: { name: 'WWF South Africa', office: 'ngo' }, lat: -33.98, lon: 18.46 },
]
const matchedNames = (model) =>
  new Set(mapElements(marketSample, { model, location: 'Cape Town' }).filter((c) => c.relevance > 0).map((c) => c.name))

const agencyM = matchedNames('agency')
assert(agencyM.has('Harbour Bistro') && agencyM.has('Gorgeous George Hotel') && agencyM.has('Kloof Hairdresser'), 'agency surfaces restaurants/hotels/salons')
assert(!agencyM.has('Allan Gray Investment') && !agencyM.has('UCT Business School'), 'agency drops finance offices & universities')

const ecomM = matchedNames('ecommerce')
assert(ecomM.has('Mr Price Canal Walk') && ecomM.has('Cape Union Mart') && ecomM.has('Faithful Wholesale'), 'ecommerce surfaces all shops incl. un-enumerated sub-types')
assert(!ecomM.has('Harbour Bistro') && !ecomM.has('Allan Gray Investment'), 'ecommerce drops restaurants & finance offices')

const consultingM = matchedNames('consulting')
assert(consultingM.has('Allan Gray Investment') && consultingM.has('Imperial Logistics CT') && consultingM.has('Coega Steel Works'), 'consulting surfaces finance/logistics/industrial')
assert(!consultingM.has('Mr Price Canal Walk') && !consultingM.has('Harbour Bistro'), 'consulting drops retail & hospitality')

const b2bM = matchedNames('b2b-saas')
assert(b2bM.has('Yoco Software') && b2bM.has('Allan Gray Investment') && b2bM.has('Workshop17'), 'b2b-saas surfaces IT/finance/coworking')
assert(!b2bM.has('UCT Business School') && !b2bM.has('Mr Price Canal Walk'), 'b2b-saas drops schools & retail')

const microM = matchedNames('micro-saas')
assert(microM.has('Yoco Software') && microM.has('Workshop17'), 'micro-saas surfaces IT & coworking')
assert(!microM.has('Imperial Logistics CT') && !microM.has('Allan Gray Investment'), 'micro-saas is narrower: drops enterprise logistics/finance')

const digitalM = matchedNames('digital-products')
assert(digitalM.has('UCT Business School') && digitalM.has('Yoco Software'), 'digital-products surfaces education & IT')
assert(!digitalM.has('Allan Gray Investment') && !digitalM.has('Mr Price Canal Walk'), 'digital-products drops finance & retail')

// the NGO is filtered out under every model
for (const model of ['agency', 'ecommerce', 'consulting', 'b2b-saas', 'micro-saas', 'digital-products']) {
  assert(!matchedNames(model).has('WWF South Africa'), `NGO office is excluded for ${model}`)
}

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
// Stale-prospect nag uses last activity (updatedAt), not original savedAt
const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
const fresh = new Date().toISOString()
const staleAttn = attentionItems(freshBp, {
  prospects: [{ blueprintId: freshBp.id, status: 'Contacted', savedAt: old, updatedAt: old }],
  savedBlueprints: [freshBp],
})
assert(staleAttn.some((a) => a.kind === 'stale'), 'a prospect untouched for 10 days is flagged stale')
const activeAttn = attentionItems(freshBp, {
  prospects: [{ blueprintId: freshBp.id, status: 'Contacted', savedAt: old, updatedAt: fresh }],
  savedBlueprints: [freshBp],
})
assert(!activeAttn.some((a) => a.kind === 'stale'), 'a recently-updated prospect is NOT flagged stale')

// --- 13. Goals & targets --------------------------------------------------
const goalBp = generateBlueprint(TECH_FOUNDER_DEMO)
for (const kind of GOAL_KIND_LIST) {
  const g = defaultGoal(kind)
  const c = computeGoal(g, { bp: goalBp, prospects: [] })
  assert(c.pct >= 0 && c.pct <= 100, `goal ${kind} pct in 0–100`)
}
// customers auto-pulls Won prospects
const wonCtx = { bp: goalBp, prospects: [
  { blueprintId: goalBp.id, status: 'Won' }, { blueprintId: goalBp.id, status: 'Won' }, { blueprintId: goalBp.id, status: 'Saved' },
] }
const custGoal = { ...defaultGoal('customers'), target: 4 }
assert(computeGoal(custGoal, wonCtx).value === 2, 'customers goal counts Won prospects')
assert(computeGoal(custGoal, wonCtx).pct === 50, 'customers goal pct = 2/4')
// roadmap auto = 0% initially
assert(computeGoal(defaultGoal('roadmap'), { bp: goalBp, prospects: [] }).pct === 0, 'roadmap goal starts 0%')
// manual revenue
const revGoal = { ...defaultGoal('revenue'), target: 1000, current: 500 }
assert(computeGoal(revGoal, { bp: goalBp, prospects: [] }).pct === 50, 'manual revenue goal pct = 500/1000')
// date goal: overdue in the past, not done
const pastGoal = { ...defaultGoal('date'), targetDate: '2000-01-01' }
assert(computeGoal(pastGoal, { bp: goalBp, prospects: [] }).overdue === true, 'past date goal is overdue')
const futureGoal = { ...defaultGoal('date'), targetDate: '2999-01-01' }
assert(computeGoal(futureGoal, { bp: goalBp, prospects: [] }).overdue === false, 'future date goal not overdue')
// done overrides
assert(computeGoal({ ...pastGoal, done: true }, { bp: goalBp, prospects: [] }).pct === 100, 'done goal is 100%')
// summary + attention hook
const sum = goalsSummary([custGoal, revGoal], wonCtx)
assert(sum.count === 2 && sum.avgPct >= 0 && sum.avgPct <= 100, 'goalsSummary well-formed')
const bpWithOverdue = { ...goalBp, goals: [pastGoal] }
assert(attentionItems(bpWithOverdue, { prospects: [], savedBlueprints: [bpWithOverdue] }).some((a) => a.kind === 'goal'), 'overdue goal surfaces in attention feed')

// --- 14. Guided onboarding ------------------------------------------------
const emptyGuide = nextStep({ activeBlueprint: null, savedBlueprints: [], prospects: [], evaluation: {} })
assert(emptyGuide.current && emptyGuide.current.tab === 'intake', 'first step guides to intake')
assert(emptyGuide.doneCount === 0 && emptyGuide.total === 6, 'guide has 6 steps, none done initially')
assert(!emptyGuide.allDone, 'guide not complete when nothing done')
const guideBp = generateBlueprint(TECH_FOUNDER_DEMO)
const withBp = nextStep({ activeBlueprint: guideBp, savedBlueprints: [guideBp], prospects: [], evaluation: {} })
assert(withBp.steps.find((s) => s.key === 'blueprint').done, 'blueprint step done once generated')
assert(withBp.steps.find((s) => s.key === 'save').done, 'save step done when in saved list')
assert(withBp.current.number >= 1 && withBp.current.number <= 6, 'current step number in range')
// fully complete
const doneBp = { ...guideBp, startDate: '2026-01-01', goals: [{ id: 'g' }] }
const full = nextStep({
  activeBlueprint: doneBp,
  savedBlueprints: [doneBp],
  prospects: [
    { blueprintId: doneBp.id }, { blueprintId: doneBp.id }, { blueprintId: doneBp.id },
  ],
  evaluation: { 'product-1': 4 },
})
assert(full.allDone === true && full.current === null, 'guide completes when all steps satisfied')
assert(getStartedSteps({ activeBlueprint: null }).every((s) => s.tab && s.cta && s.label), 'every step well-formed')

// --- 15. AI prompt pack ---------------------------------------------------
assert(generatePromptPack(null).length === 0, 'prompt pack empty without blueprint')
const packBp = generateBlueprint(TECH_FOUNDER_DEMO)
const pack = generatePromptPack(packBp)
assert(pack.length >= 5, 'prompt pack has multiple prompts')
assert(pack.every((p) => p.id && p.title && p.prompt && p.prompt.length > 50), 'each prompt is well-formed')
assert(pack.every((p) => p.prompt.includes(packBp.concept.productName)), 'prompts are personalized with the product name')
assert(typeof promptPackToMarkdown(packBp) === 'string' && promptPackToMarkdown(packBp).includes('Prompt Pack'), 'prompt pack exports markdown')

// --- 16. Format utilities -------------------------------------------------
assert(withCommas(1234567) === '1,234,567', 'withCommas adds thousands separators')
assert(withCommas(0) === '0', 'withCommas handles zero')
assert(timeAgo(new Date().toISOString()) === 'just now', 'timeAgo: now → just now')
assert(timeAgo(new Date(Date.now() - 2 * 60 * 1000).toISOString()) === '2m ago', 'timeAgo: minutes')
assert(timeAgo(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()) === '3h ago', 'timeAgo: hours')
assert(timeAgo(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()) === '5d ago', 'timeAgo: days')
assert(timeAgo('') === '' && timeAgo('nope') === '', 'timeAgo: blank/invalid → empty')

// --- summary --------------------------------------------------------------
console.log(`\n${checks} checks run.`)
if (fails === 0) {
  console.log('✅ ALL PASS')
  process.exit(0)
} else {
  console.log(`❌ ${fails} FAILURE(S)`)
  process.exit(1)
}
