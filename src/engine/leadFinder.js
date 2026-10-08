// ============================================================================
//  Aspir by WTS — Client & Company Finder
//  Deterministic prospect generator: given a location (city + country) and the
//  founder's domain / target model, it synthesizes a ranked list of plausible
//  target companies or clients to pursue. No network calls — reproducible.
// ============================================================================

const hashStr = (str = '') => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

// Seeded PRNG (mulberry32) so a given search always yields the same list
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const capitalize = (s = '') =>
  s
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')

// Neutral, brandable name parts — deliberately NOT geographic (no Harbor,
// Cedar, North, Atlas, etc.) so a generated company never reads as being in
// some other place than the one the user searched.
const PREFIXES = [
  'Lumen', 'Vanta', 'Zenith', 'Pulse', 'Cobalt', 'Onyx', 'Quanta', 'Juno',
  'Ardent', 'Nimbus', 'Beacon', 'Forge', 'Axis', 'Nova', 'Vireo', 'Kinetic',
]
const ROOTS = [
  'Labs', 'Group', 'Partners', 'Works', 'Collective', 'Systems', 'Ventures',
  'Industries', 'Solutions', 'Co', 'Digital', 'Studio', 'Holdings', 'Dynamics',
]

// Map a country to a sensible web TLD so the generated site reinforces the
// searched location instead of defaulting to a US-looking .com.
const COUNTRY_TLDS = {
  'south africa': 'co.za',
  'united kingdom': 'co.uk',
  uk: 'co.uk',
  england: 'co.uk',
  australia: 'com.au',
  'new zealand': 'co.nz',
  canada: 'ca',
  india: 'in',
  nigeria: 'com.ng',
  kenya: 'co.ke',
  germany: 'de',
  france: 'fr',
  spain: 'es',
  italy: 'it',
  netherlands: 'nl',
  ireland: 'ie',
  singapore: 'sg',
  'united arab emirates': 'ae',
  uae: 'ae',
  brazil: 'com.br',
  mexico: 'mx',
  japan: 'jp',
  'united states': 'com',
  usa: 'com',
  us: 'com',
}
const tldFor = (country) => COUNTRY_TLDS[(country || '').trim().toLowerCase()] || 'com'

// What kind of target each business model is realistically chasing
const TARGET_SHAPE = {
  'b2b-saas': { label: 'SMB & mid-market companies', sizes: ['11–50', '51–200', '201–500'], buyerRoles: ['Head of Operations', 'VP Engineering', 'COO', 'IT Director'] },
  'micro-saas': { label: 'solo operators & small teams', sizes: ['1–10', '11–50'], buyerRoles: ['Founder', 'Operations Lead', 'Freelancer', 'Office Manager'] },
  ecommerce: { label: 'retailers, stockists & wholesale buyers', sizes: ['1–10', '11–50', '51–200'], buyerRoles: ['Buyer', 'Store Owner', 'Merchandising Lead', 'Procurement Manager'] },
  agency: { label: 'growth-stage companies needing execution', sizes: ['11–50', '51–200', '201–500'], buyerRoles: ['CMO', 'Head of Growth', 'Founder', 'Marketing Director'] },
  consulting: { label: 'funded startups & established firms', sizes: ['11–50', '51–200', '201–1000'], buyerRoles: ['CEO', 'Founder', 'VP Strategy', 'General Manager'] },
  'digital-products': { label: 'professionals & teams upskilling', sizes: ['1–10', '11–50', '51–200'], buyerRoles: ['L&D Manager', 'Team Lead', 'Founder', 'HR Director'] },
}

const SIGNALS = [
  'Recently raised funding',
  'Actively hiring in this area',
  'Expanding to a new market',
  'Posted about a related pain point',
  'Growing headcount quarter-over-quarter',
  'Launched a new product line',
  'Mentioned in local business press',
  'Opened a second location',
  'Rebranding / website refresh underway',
  'Switched tools recently (migration window)',
]

const PRIORITY = ['Hot', 'Warm', 'Nurture']

function buildReason(domain, industry, shape) {
  const d = domain || industry || 'your area'
  const opts = [
    `Operates in ${industry || d} — a direct fit for your ${domain || 'expertise'}.`,
    `Profile matches your ideal customer: ${shape.label}.`,
    `Likely feeling the exact pain your offer solves in ${d}.`,
    `Adjacent to clients you already understand in ${industry || d}.`,
    `Strong overlap between their needs and your ${domain || 'background'}.`,
  ]
  return opts
}

function buildOutreach(companyName, buyerRole, domain) {
  const d = domain || 'your work'
  return [
    `Reference a specific ${d} challenge ${companyName} likely faces, then offer a 15-min teardown.`,
    `Lead with a relevant win from your background and ask the ${buyerRole} one sharp question.`,
    `Send a short, personalized note tying your ${d} edge to their current growth stage.`,
    `Offer a free mini-audit relevant to ${companyName}'s ${d} setup — value first.`,
  ]
}

/**
 * Generate a deterministic, ranked list of prospect companies / clients.
 * @param {object} opts
 * @param {string} opts.city
 * @param {string} opts.country
 * @param {string} opts.industry   e.g. "logistics, SaaS"
 * @param {string} opts.domain     e.g. "supply chain operations"
 * @param {string} opts.targetModel  business-model id
 * @param {number} opts.count      how many to generate
 */
export function generateLeads({ city = '', country = '', industry = '', domain = '', targetModel = 'b2b-saas', count = 12 }) {
  const shape = TARGET_SHAPE[targetModel] || TARGET_SHAPE['b2b-saas']
  const seedStr = `${city}|${country}|${industry}|${domain}|${targetModel}`
  const seed = hashStr(seedStr)
  const rand = rng(seed || 1)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  const industriesList = (industry || domain || 'business services')
    .split(/[\s,;/]+/)
    .map((x) => x.trim())
    .filter(Boolean)

  const reasons = buildReason(domain, industry, shape)
  const cityLabel = capitalize(city.trim())
  const countryLabel = capitalize(country.trim())
  // Every lead is anchored to the exact location the user searched.
  const locationLabel = [cityLabel, countryLabel].filter(Boolean).join(', ') || 'Your region'
  const tld = tldFor(country)

  const used = new Set()
  const leads = []
  for (let i = 0; i < count; i++) {
    let name
    let guard = 0
    do {
      name = `${pick(PREFIXES)} ${pick(ROOTS)}`
      guard++
    } while (used.has(name) && guard < 20)
    used.add(name)

    const sector = industriesList.length ? capitalize(pick(industriesList)) : 'Business Services'
    const buyerRole = pick(shape.buyerRoles)
    const size = pick(shape.sizes)
    const signal = pick(SIGNALS)
    const reason = pick(reasons)
    const outreach = pick(buildOutreach(name, buyerRole, domain))
    // Fit score weighted so the list is meaningfully ranked
    const fit = Math.round(60 + rand() * 38)

    leads.push({
      id: `lead_${seed}_${i}`,
      name,
      sector,
      city: cityLabel,
      country: countryLabel,
      location: locationLabel,
      size: `${size} employees`,
      buyerRole,
      signal,
      reason,
      outreach,
      fit,
      priority: fit >= 85 ? PRIORITY[0] : fit >= 72 ? PRIORITY[1] : PRIORITY[2],
      website: `www.${name.toLowerCase().replace(/\s+/g, '')}.${tld}`,
    })
  }

  return leads.sort((a, b) => b.fit - a.fit)
}

export function leadsToCSV(leads, meta = {}) {
  const header = ['Company', 'Sector', 'Location', 'Size', 'Best contact', 'Priority', 'Fit %', 'Buying signal', 'Why it fits', 'Outreach angle', 'Website']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = leads.map((l) =>
    [l.name, l.sector, l.location, l.size, l.buyerRole, l.priority, l.fit, l.signal, l.reason, l.outreach, l.website].map(esc).join(','),
  )
  const preamble = meta.title ? [`"${meta.title}"`, ''] : []
  return [...preamble, header.map(esc).join(','), ...rows].join('\n')
}
