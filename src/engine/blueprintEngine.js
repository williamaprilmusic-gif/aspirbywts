// ============================================================================
//  Aspir by WTS — Analytical Blueprint Engine
//  Deterministic "AI" synthesis: turns an intake payload into a complete,
//  market-validated enterprise blueprint. No network calls — all reasoning is
//  rule/heuristic driven so output is reproducible and instant.
// ============================================================================

export const BUSINESS_MODELS = [
  { id: 'b2b-saas', label: 'B2B SaaS' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'agency', label: 'Agency' },
  { id: 'micro-saas', label: 'Micro-SaaS' },
  { id: 'consulting', label: 'High-Ticket Consulting' },
  { id: 'digital-products', label: 'Digital Products' },
  { id: 'local-service', label: 'Local / B2B Service' },
]

export const CURRENCIES = {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  ZAR: { symbol: 'R', rate: 18.3 },
}

// ---------------------------------------------------------------------------
//  Small deterministic helpers
// ---------------------------------------------------------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Stable string hash → used to deterministically pick flavour text
const hashStr = (str = '') => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

const pick = (arr, seed) => arr[hashStr(String(seed)) % arr.length]
const countWords = (s = '') => s.split(/[\s,;/]+/).map((x) => x.trim()).filter(Boolean)
const money = (currency, amount) => {
  const c = CURRENCIES[currency] || CURRENCIES.USD
  const v = amount * c.rate
  return `${c.symbol}${Math.round(v).toLocaleString('en-US')}`
}

// ---------------------------------------------------------------------------
//  Model economics profiles (base assumptions the engine tunes per founder)
// ---------------------------------------------------------------------------
const MODEL_PROFILES = {
  'b2b-saas': {
    name: 'B2B SaaS',
    baseCac: 420,
    baseAcv: 3600,
    grossMargin: 0.82,
    churnMonthly: 0.03,
    breakevenMonths: 9,
    priceTiers: [
      { name: 'Starter', price: 49, cadence: '/mo', features: ['Core workflow automation', '1 workspace', 'Email support'] },
      { name: 'Growth', price: 149, cadence: '/mo', features: ['Everything in Starter', 'Team collaboration', 'Integrations & API', 'Priority support'] },
      { name: 'Scale', price: 499, cadence: '/mo', features: ['Everything in Growth', 'SSO & audit logs', 'Dedicated success manager', 'SLA'] },
    ],
    channels: ['LinkedIn founder-led outbound', 'SEO on bottom-funnel keywords', 'Partner / integration marketplaces', 'Niche community sponsorships'],
    salesMotion: 'Product-led trial with a human-assisted close for annual contracts.',
  },
  'micro-saas': {
    name: 'Micro-SaaS',
    baseCac: 90,
    baseAcv: 360,
    grossMargin: 0.88,
    churnMonthly: 0.05,
    breakevenMonths: 5,
    priceTiers: [
      { name: 'Solo', price: 19, cadence: '/mo', features: ['Single user', 'Core feature set', 'Community support'] },
      { name: 'Pro', price: 39, cadence: '/mo', features: ['Everything in Solo', 'Automations', 'Export & integrations'] },
      { name: 'Lifetime', price: 299, cadence: ' one-time', features: ['All Pro features', 'Lifetime updates', 'Founder access'] },
    ],
    channels: ['Build-in-public on X/LinkedIn', 'Directory & marketplace listings', 'SEO long-tail tool pages', 'Targeted subreddit & Slack communities'],
    salesMotion: 'Fully self-serve, no-touch checkout with annual upsell.',
  },
  ecommerce: {
    name: 'E-commerce',
    baseCac: 28,
    baseAcv: 72,
    grossMargin: 0.52,
    churnMonthly: 0.0,
    breakevenMonths: 7,
    priceTiers: [
      { name: 'Core Product', price: 39, cadence: '', features: ['Flagship SKU', 'Standard shipping'] },
      { name: 'Bundle', price: 89, cadence: '', features: ['3-pack value bundle', 'Free shipping', '10% saving'] },
      { name: 'Subscribe & Save', price: 33, cadence: '/mo', features: ['Auto-replenish', '15% saving', 'Skip anytime'] },
    ],
    channels: ['Meta & TikTok paid social', 'Influencer / UGC seeding', 'Email & SMS flows (Klaviyo)', 'Amazon / marketplace presence'],
    salesMotion: 'High-velocity DTC storefront optimised around AOV and repeat purchase.',
  },
  agency: {
    name: 'Agency',
    baseCac: 650,
    baseAcv: 24000,
    grossMargin: 0.55,
    churnMonthly: 0.04,
    breakevenMonths: 3,
    priceTiers: [
      { name: 'Project', price: 4500, cadence: ' / project', features: ['Scoped deliverable', '30-day support', 'One revision round'] },
      { name: 'Retainer', price: 3500, cadence: '/mo', features: ['Dedicated hours', 'Monthly strategy call', 'Priority turnaround'] },
      { name: 'Partner', price: 8000, cadence: '/mo', features: ['Embedded team', 'Quarterly roadmap', 'Executive reporting'] },
    ],
    channels: ['Warm referral & network activation', 'Targeted LinkedIn outreach', 'Case-study driven content', 'Strategic partnership referrals'],
    salesMotion: 'Consultative, relationship-led sales with discovery → proposal → retainer.',
  },
  consulting: {
    name: 'High-Ticket Consulting',
    baseCac: 900,
    baseAcv: 18000,
    grossMargin: 0.78,
    churnMonthly: 0.06,
    breakevenMonths: 2,
    priceTiers: [
      { name: 'Intensive', price: 2500, cadence: ' / session', features: ['Half-day deep dive', 'Action plan', '2 weeks async support'] },
      { name: 'Engagement', price: 9000, cadence: ' / 90 days', features: ['Bi-weekly sessions', 'Full playbook', 'Slack access'] },
      { name: 'Advisory', price: 6000, cadence: '/mo', features: ['Ongoing advisory', 'On-call strategy', 'Board-level support'] },
    ],
    channels: ['Authority content & thought leadership', 'Podcast guesting', 'Warm referral loops', 'Selective speaking engagements'],
    salesMotion: 'Trust-led inbound into high-ticket discovery calls.',
  },
  'digital-products': {
    name: 'Digital Products',
    baseCac: 22,
    baseAcv: 120,
    grossMargin: 0.9,
    churnMonthly: 0.0,
    breakevenMonths: 4,
    priceTiers: [
      { name: 'Template / Guide', price: 29, cadence: '', features: ['Instant download', 'Lifetime access', 'Free updates'] },
      { name: 'Course', price: 199, cadence: '', features: ['Full curriculum', 'Workbook & templates', 'Community access'] },
      { name: 'Cohort / Bundle', price: 499, cadence: '', features: ['Live cohort', 'All products', 'Accountability group'] },
    ],
    channels: ['Content engine (YouTube / newsletter)', 'Launch waitlists & webinars', 'Affiliate partners', 'Organic social + lead magnets'],
    salesMotion: 'Audience-first funnel: free value → email list → launch cadence.',
  },
  'local-service': {
    name: 'Local / B2B Service',
    baseCac: 300,
    baseAcv: 14000,
    grossMargin: 0.45,
    churnMonthly: 0.025,
    breakevenMonths: 4,
    priceTiers: [
      { name: 'Per-route / job', price: 350, cadence: ' / month', features: ['Single route or site', 'Fixed schedule', 'Standard support'] },
      { name: 'Contract', price: 1800, cadence: '/mo', features: ['Multiple routes / sites', 'Dedicated account manager', 'SLA & reporting'] },
      { name: 'Enterprise', price: 6000, cadence: '/mo', features: ['Full coverage', 'Custom scheduling', 'On-site coordinator'] },
    ],
    channels: ['Direct outreach to employers & facilities managers', 'Referrals from existing clients', 'Local B2B networking & tenders', 'Targeted LinkedIn to HR / operations leads'],
    salesMotion: 'Relationship-led B2B sales: site visit → quote → contract.',
  },
}

// ---------------------------------------------------------------------------
//  Founder-Market Fit scoring
// ---------------------------------------------------------------------------
function computeFitScore(intake) {
  let score = 42
  const hard = countWords(intake.hardSkills).length
  const soft = countWords(intake.softSkills).length
  const domains = countWords(intake.domainExpertise).length
  const industries = countWords(intake.industries).length
  const passions = countWords(intake.passions).length

  score += clamp(hard * 4, 0, 20)
  score += clamp(soft * 2, 0, 8)
  score += clamp(domains * 5, 0, 15)
  score += clamp(industries * 2.5, 0, 8)
  score += clamp(passions * 2, 0, 6)

  // Capital & commitment signal
  const capital = Number(intake.capital) || 0
  if (capital >= 500) score += 3
  if (capital >= 5000) score += 3
  const hours = Number(intake.weeklyHours) || 0
  score += clamp(hours / 5, 0, 8)

  // Risk tolerance aligns with aggressive models
  const risk = Number(intake.riskTolerance) || 5
  if (['agency', 'consulting', 'local-service'].includes(intake.targetModel) && domains >= 2) score += 5
  if (['b2b-saas', 'micro-saas'].includes(intake.targetModel) && hard >= 2) score += 5
  if (intake.technicalResources && intake.technicalResources.trim().length > 10) score += 4

  // Reflection depth (lessons) signals founder maturity
  if ((intake.pastWins || '').length > 20) score += 2
  if ((intake.pastFailures || '').length > 20) score += 2
  score += (risk - 5) * 0.4

  return clamp(Math.round(score), 38, 97)
}

// ---------------------------------------------------------------------------
//  Concept synthesis (value prop, name, audience)
// ---------------------------------------------------------------------------
function synthesizeConcept(intake, profile) {
  const domain = countWords(intake.domainExpertise)[0] || countWords(intake.industries)[0] || 'operations'
  const skill = countWords(intake.hardSkills)[0] || 'expertise'
  const audienceSeed = `${intake.targetModel}-${domain}`

  const audiences = {
    'b2b-saas': [`${domain}-focused SMB teams drowning in manual process`, `mid-market ${domain} operators without dedicated tooling`],
    'micro-saas': [`solo ${domain} professionals who need one job done well`, `small ${domain} teams priced out of enterprise suites`],
    ecommerce: [`consumers seeking a better ${domain} product experience`, `niche ${domain} enthusiasts underserved by big brands`],
    agency: [`growth-stage companies needing senior ${domain} execution`, `founders who want ${domain} done-for-them, not DIY`],
    consulting: [`executives and founders stuck on a specific ${domain} problem`, `funded startups needing a ${domain} expert on demand`],
    'digital-products': [`aspiring ${domain} practitioners who learn by doing`, `professionals upskilling in ${domain} on their own time`],
    'local-service': [`employers who need reliable ${domain} handled for their staff`, `operations & facilities managers outsourcing ${domain}`],
  }

  const audience = pick(audiences[intake.targetModel] || audiences['b2b-saas'], audienceSeed)

  const nameRoots = [capitalize(domain), capitalize(skill)]
  const nameSuffix = {
    'b2b-saas': ['Flow', 'OS', 'Hub', 'Stack'],
    'micro-saas': ['Kit', 'Lite', 'Snap', 'Loop'],
    ecommerce: ['Co', 'Supply', 'Goods', 'Collective'],
    agency: ['Collective', 'Studio', 'Labs', 'Partners'],
    consulting: ['Advisory', 'Partners', 'Group', 'Method'],
    'digital-products': ['Academy', 'Playbook', 'Lab', 'School'],
    'local-service': ['Services', 'Solutions', 'Group', 'Logistics'],
  }
  const suffix = pick(nameSuffix[intake.targetModel] || ['Co'], `${audienceSeed}-sfx`)
  const productName = `${pick(nameRoots, audienceSeed)}${suffix}`

  const valueProp =
    `A ${profile.name.toLowerCase()} that leverages your ${domain} expertise to help ${audience}. ` +
    `Where generic alternatives are shallow, ${productName} wins because it is built by an operator who has actually lived the problem — ` +
    `turning your ${skill} and ${(countWords(intake.hardSkills)[1] || 'practical')} background into a repeatable, outcome-driven offer.`

  const corePain = pick(
    [
      `wasting hours on ${domain} work that should be systematised`,
      `paying for tools / vendors that don't understand ${domain} nuance`,
      `lacking a trusted ${domain} partner who has been in their shoes`,
      `struggling to get measurable ${domain} results without senior help`,
    ],
    audienceSeed,
  )

  return { productName, audience, valueProp, corePain, domain, skill }
}

function capitalize(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
//  Competitive moat
// ---------------------------------------------------------------------------
function buildMoat(intake, concept) {
  const parts = []
  const domains = countWords(intake.domainExpertise)
  const industries = countWords(intake.industries)
  if (domains.length) parts.push(`deep, first-hand expertise in ${domains.slice(0, 2).join(' & ')}`)
  if (industries.length) parts.push(`an existing network across ${industries.slice(0, 2).join(' & ')}`)
  if ((intake.pastWins || '').length > 15) parts.push('a track record of past wins you can point to as proof')
  if ((intake.technicalResources || '').length > 10) parts.push('ready technical resources that shorten your build time')
  if (!parts.length) parts.push('an authentic operator perspective competitors lack')

  return (
    `${concept.productName}'s defensibility comes from ${parts.join(', ')}. ` +
    `This is a moat large competitors cannot easily copy because it is rooted in your specific, lived experience rather than capital or headcount.`
  )
}

// ---------------------------------------------------------------------------
//  SWOT
// ---------------------------------------------------------------------------
function buildSWOT(intake, concept, fitScore) {
  const hard = countWords(intake.hardSkills)
  const domains = countWords(intake.domainExpertise)
  const capital = Number(intake.capital) || 0
  const hours = Number(intake.weeklyHours) || 0
  const risk = Number(intake.riskTolerance) || 5

  const strengths = []
  if (hard.length) strengths.push(`Strong hands-on skills: ${hard.slice(0, 3).join(', ')}.`)
  if (domains.length) strengths.push(`Credible domain authority in ${domains.slice(0, 2).join(' & ')}.`)
  if (fitScore >= 70) strengths.push(`High founder-market fit (${fitScore}%) de-risks early traction.`)
  if ((intake.pastWins || '').length > 15) strengths.push('Documented past wins to anchor a credibility story.')
  if (!strengths.length) strengths.push('Fresh, motivated operator energy to move fast.')

  const weaknesses = []
  if (capital < 2000) weaknesses.push(`Limited starting capital (${money(intake.currency, capital)}) constrains paid acquisition.`)
  if (hours < 15) weaknesses.push(`Only ${hours}h/week available — execution velocity will be gated.`)
  if (!(intake.technicalResources || '').trim()) weaknesses.push('No stated technical resources; may need to outsource build.')
  if ((intake.pastFailures || '').length < 15) weaknesses.push('Few documented lessons — watch for repeated mistakes.')
  if (!weaknesses.length) weaknesses.push('Nascent brand with zero existing market presence.')

  const opportunities = [
    `${concept.audience} remain underserved by generic incumbents.`,
    `Positioning around "${concept.corePain}" is a sharp, specific wedge.`,
    risk >= 7 ? 'High risk tolerance enables bolder, faster bets than competitors.' : 'A measured approach can win trust in a sceptical market.',
  ]

  const threats = []
  threats.push('Well-funded incumbents could copy surface features (mitigated by your moat).')
  threats.push('Market education cost if the pain is not yet acutely felt.')
  if (capital < 2000) threats.push('Cash runway risk before reaching break-even.')
  threats.push('Founder burnout if scope is not ruthlessly constrained.')

  return { strengths, weaknesses, opportunities, threats }
}

// ---------------------------------------------------------------------------
//  Risk mitigation matrix
// ---------------------------------------------------------------------------
function buildRiskMatrix(intake, profile) {
  const capital = Number(intake.capital) || 0
  const hours = Number(intake.weeklyHours) || 0
  const risks = [
    {
      risk: 'Insufficient demand validation',
      severity: 'High',
      mitigation: 'Run 15+ problem interviews and a pre-sale landing page before building anything substantial.',
    },
    {
      risk: 'Cash runway depletion',
      severity: capital < 2000 ? 'High' : 'Medium',
      mitigation: 'Stay service/pre-sale funded early; cap fixed costs and reinvest first revenue into acquisition.',
    },
    {
      risk: 'Customer acquisition cost exceeds LTV',
      severity: 'Medium',
      mitigation: `Lead with low-cost channels (${profile.channels[0]}, ${profile.channels[1]}) and track CAC weekly against a hard ceiling.`,
    },
    {
      risk: 'Execution bottleneck (limited time)',
      severity: hours < 15 ? 'High' : 'Medium',
      mitigation: 'Ruthlessly scope to one ICP and one offer; automate or delegate anything off the critical path.',
    },
    {
      risk: 'Competitive response from incumbents',
      severity: 'Medium',
      mitigation: 'Double down on the experience-based moat and niche positioning incumbents cannot authentically occupy.',
    },
  ]
  return risks
}

// ---------------------------------------------------------------------------
//  Unit economics & projections
// ---------------------------------------------------------------------------
function buildEconomics(intake, profile, fitScore) {
  const risk = Number(intake.riskTolerance) || 5
  const capital = Number(intake.capital) || 0
  const fitMod = 1 + (fitScore - 60) / 200 // better fit → lower CAC, higher ACV

  const cac = Math.round((profile.baseCac / fitMod) * (capital < 2000 ? 0.85 : 1))
  const acv = Math.round(profile.baseAcv * fitMod)
  const lifetimeMonths = profile.churnMonthly > 0 ? Math.round(1 / profile.churnMonthly) : 18
  const ltv =
    profile.churnMonthly > 0
      ? Math.round(acv * profile.grossMargin)
      : Math.round(acv * profile.grossMargin * (profile.name === 'E-commerce' ? 2.4 : 1))
  const ltvCacRatio = cac > 0 ? +(ltv / cac).toFixed(1) : 0
  const breakeven = clamp(Math.round(profile.breakevenMonths * (capital < 2000 ? 1.25 : 1) * (fitScore >= 75 ? 0.85 : 1)), 1, 24)

  // 12-month gross revenue projection (ramp curve)
  const monthlyDeals = []
  let customers = 0
  const velocity = clamp((Number(intake.weeklyHours) || 10) / 10 + risk / 5, 0.8, 4)
  for (let m = 1; m <= 12; m++) {
    const newCustomers = Math.max(1, Math.round(velocity * Math.pow(1.22, m - 1) * (fitScore / 70)))
    customers += newCustomers
    const monthlyRev =
      profile.churnMonthly > 0 ? customers * (acv / 12) : newCustomers * acv
    monthlyDeals.push({ month: m, newCustomers, activeCustomers: customers, revenue: Math.round(monthlyRev) })
  }
  const year1Gross = monthlyDeals.reduce((s, x) => s + x.revenue, 0)

  return {
    cac,
    acv,
    ltv,
    ltvCacRatio,
    grossMargin: profile.grossMargin,
    churnMonthly: profile.churnMonthly,
    lifetimeMonths,
    breakeven,
    monthlyDeals,
    year1Gross,
    priceTiers: profile.priceTiers,
  }
}

// ---------------------------------------------------------------------------
//  Default 90-day roadmap
// ---------------------------------------------------------------------------
export function buildRoadmap(concept, profile) {
  const mk = (id, text) => ({ id, text, done: false })
  return [
    {
      id: 'p1',
      title: 'Validation & MVP Setup',
      window: 'Days 1–15',
      tasks: [
        mk('p1-1', `Write a one-page positioning doc for ${concept.productName}`),
        mk('p1-2', 'Build a conversion-focused landing page with a clear CTA'),
        mk('p1-3', `Book & run 15 problem interviews with ${concept.audience}`),
        mk('p1-4', `Test the core offer around "${concept.corePain}"`),
        mk('p1-5', 'Collect 25+ waitlist signups or 3 pre-sale commitments'),
      ],
    },
    {
      id: 'p2',
      title: 'Infrastructure & Legal',
      window: 'Days 16–30',
      tasks: [
        mk('p2-1', 'Register the business entity and open a business bank account'),
        mk('p2-2', `Stand up the core tech stack for a ${profile.name.toLowerCase()}`),
        mk('p2-3', 'Integrate a payment gateway (Stripe / Paystack / PayPal)'),
        mk('p2-4', 'Set up analytics, email, and a lightweight CRM'),
        mk('p2-5', 'Draft terms, privacy policy, and basic contracts'),
      ],
    },
    {
      id: 'p3',
      title: 'Soft Launch & First Customers',
      window: 'Days 31–60',
      tasks: [
        mk('p3-1', `Launch outreach via ${profile.channels[0]}`),
        mk('p3-2', 'Onboard 5–10 beta customers and watch them use it'),
        mk('p3-3', 'Run weekly feedback loops and ship fast iterations'),
        mk('p3-4', 'Capture 3 testimonials / case studies'),
        mk('p3-5', 'Close your first paying customers and record revenue'),
      ],
    },
    {
      id: 'p4',
      title: 'Optimization & Scale',
      window: 'Days 61–90',
      tasks: [
        mk('p4-1', `Double down on the best-performing channel (${profile.channels[1]})`),
        mk('p4-2', 'Automate onboarding and repetitive operations'),
        mk('p4-3', 'Introduce a paid acquisition test with a hard CAC ceiling'),
        mk('p4-4', 'Document SOPs and delegate / hire the first contractor'),
        mk('p4-5', 'Review unit economics and set the next 90-day targets'),
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
//  Executive summary + GTM assembly
// ---------------------------------------------------------------------------
function buildExecSummary(intake, concept, profile, economics) {
  const revenueStreams = {
    'b2b-saas': ['Recurring subscription revenue', 'Annual contract upsells', 'Usage / seat expansion'],
    'micro-saas': ['Monthly subscriptions', 'Annual plans', 'One-time lifetime deals'],
    ecommerce: ['Direct product sales', 'Bundles & AOV upsells', 'Subscribe & save recurring'],
    agency: ['Monthly retainers', 'Project fees', 'Performance / upsell add-ons'],
    consulting: ['High-ticket engagements', 'Monthly advisory retainers', 'Intensive workshops'],
    'digital-products': ['Course & product sales', 'Cohort / community memberships', 'Affiliate & upsell revenue'],
    'local-service': ['Monthly service contracts', 'Per-route / per-job fees', 'Add-on routes & upsells'],
  }
  const elevator =
    `${concept.productName} is a ${profile.name.toLowerCase()} for ${concept.audience}, ` +
    `solving the pain of ${concept.corePain}. Projected year-one gross revenue of ${money(intake.currency, economics.year1Gross)} ` +
    `with an LTV:CAC of ${economics.ltvCacRatio}:1 and break-even by month ${economics.breakeven}.`
  return {
    elevator,
    revenueStreams: revenueStreams[intake.targetModel] || revenueStreams['b2b-saas'],
    differentiator: concept.valueProp,
  }
}

function buildGTM(intake, concept, profile) {
  return {
    channels: profile.channels,
    salesMotion: profile.salesMotion,
    contentEngine: `Publish ${concept.domain}-focused content weekly to build authority: tear-downs, how-tos, and proof. ` +
      `Convert audience to an email list, then nurture toward the core offer.`,
    first100: `Reach the first 100 customers through ${profile.channels[0]} and ${profile.channels[1]}, ` +
      `leaning on your existing network and problem-interview relationships before investing in paid acquisition.`,
  }
}

// ---------------------------------------------------------------------------
//  Main entry point
// ---------------------------------------------------------------------------
export function generateBlueprint(intake) {
  const modelId = intake.targetModel && MODEL_PROFILES[intake.targetModel] ? intake.targetModel : 'b2b-saas'
  const profile = MODEL_PROFILES[modelId]

  const fitScore = computeFitScore({ ...intake, targetModel: modelId })
  const concept = synthesizeConcept({ ...intake, targetModel: modelId }, profile)
  const moat = buildMoat(intake, concept)
  const swot = buildSWOT(intake, concept, fitScore)
  const riskMatrix = buildRiskMatrix(intake, profile)
  const economics = buildEconomics(intake, profile, fitScore)
  const execSummary = buildExecSummary({ ...intake, targetModel: modelId }, concept, profile, economics)
  const gtm = buildGTM({ ...intake, targetModel: modelId }, concept, profile)
  const roadmap = buildRoadmap(concept, profile)

  return {
    id: `bp_${Date.now()}_${hashStr(concept.productName) % 9999}`,
    createdAt: new Date().toISOString(),
    intake: { ...intake, targetModel: modelId },
    modelLabel: profile.name,
    currency: intake.currency || 'USD',
    fitScore,
    concept,
    moat,
    swot,
    riskMatrix,
    economics,
    execSummary,
    gtm,
    roadmap,
  }
}

export { money }
