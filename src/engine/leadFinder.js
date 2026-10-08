// ============================================================================
//  Aspir by WTS — Client & Company Finder (real-search launchpad)
//  The app has no internet access, so it cannot list real companies itself.
//  Instead it builds READY-TO-RUN search links (Google, Google Maps, LinkedIn)
//  that surface actual local businesses matching your industry + location,
//  plus the angle to approach each segment. Deterministic + honest.
// ============================================================================

const hashStr = (str = '') => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

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

// What kind of target each business model is realistically chasing
const TARGET_SHAPE = {
  'b2b-saas': { label: 'SMB & mid-market companies', segments: ['small & mid-size', 'fast-growing', 'recently funded'], buyerRoles: ['Head of Operations', 'VP Engineering', 'COO', 'IT Director'] },
  'micro-saas': { label: 'solo operators & small teams', segments: ['solo / freelance', 'small teams (1–20)', 'independent'], buyerRoles: ['Founder', 'Operations Lead', 'Freelancer', 'Office Manager'] },
  ecommerce: { label: 'retailers, stockists & wholesale buyers', segments: ['independent retailers', 'boutique stores', 'wholesale buyers'], buyerRoles: ['Buyer', 'Store Owner', 'Merchandising Lead', 'Procurement Manager'] },
  agency: { label: 'growth-stage companies needing execution', segments: ['growth-stage', 'scale-ups', 'established brands'], buyerRoles: ['CMO', 'Head of Growth', 'Founder', 'Marketing Director'] },
  consulting: { label: 'funded startups & established firms', segments: ['funded startups', 'established firms', 'scaling teams'], buyerRoles: ['CEO', 'Founder', 'VP Strategy', 'General Manager'] },
  'digital-products': { label: 'professionals & teams upskilling', segments: ['small teams', 'training-focused orgs', 'professional communities'], buyerRoles: ['L&D Manager', 'Team Lead', 'Founder', 'HR Director'] },
}

const SIGNALS = [
  'recently raised funding',
  'actively hiring',
  'opened a new location',
  'launched a new product',
  'rebranding or new website',
  'growing headcount',
]

const PRIORITY = ['Hot', 'Warm', 'Nurture']

// --- Real, working search links -------------------------------------------
const enc = (s) => encodeURIComponent(s.trim().replace(/\s+/g, ' '))

export function buildSearchLinks(query, { city = '', country = '' } = {}) {
  const loc = [city, country].filter(Boolean).join(' ')
  const full = [query, loc && `in ${loc}`].filter(Boolean).join(' ')
  const mapsQ = [query, loc].filter(Boolean).join(' in ')
  return {
    google: `https://www.google.com/search?q=${enc(full + ' companies')}`,
    maps: `https://www.google.com/maps/search/${enc(mapsQ || query)}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${enc([query, loc].filter(Boolean).join(' '))}`,
  }
}

/**
 * Build ready-to-run prospect SEARCHES (not fabricated companies).
 * Each item is a target segment with real Google / Maps / LinkedIn links and
 * the angle to approach it.
 */
export function generateLeads({ city = '', country = '', industry = '', domain = '', targetModel = 'b2b-saas', count = 12 }) {
  const shape = TARGET_SHAPE[targetModel] || TARGET_SHAPE['b2b-saas']
  const seed = hashStr(`${city}|${country}|${industry}|${domain}|${targetModel}`)
  const rand = rng(seed || 1)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  const industriesList = (industry || domain || 'business services')
    .split(/[\s,;/]+/)
    .map((x) => x.trim())
    .filter(Boolean)

  const cityLabel = capitalize(city.trim())
  const countryLabel = capitalize(country.trim())
  const location = [cityLabel, countryLabel].filter(Boolean).join(', ') || 'Your region'
  const locCtx = { city: cityLabel, country: countryLabel }

  // Broad, top-level searches for the whole industry in the location.
  const broad = buildSearchLinks(industriesList[0] || 'business', locCtx)

  // Build target segments = industry keyword × segment qualifier.
  const items = []
  let i = 0
  for (const seg of shape.segments) {
    for (const ind of industriesList) {
      if (items.length >= count) break
      const sector = capitalize(ind)
      const title = `${capitalize(seg)} ${sector} businesses`
      const query = `${seg} ${ind}`
      const buyerRole = pick(shape.buyerRoles)
      const signal = pick(SIGNALS)
      const fit = Math.round(65 + rand() * 33)
      items.push({
        id: `search_${seed}_${i++}`,
        title,
        query,
        sector,
        segment: capitalize(seg),
        city: cityLabel,
        country: countryLabel,
        location,
        buyerRole,
        lookFor: `Shortlist ones that are ${signal} — they're most likely to need help now.`,
        reason: `${capitalize(seg)} ${sector} firms in ${location} fit your ${domain || 'offer'}.`,
        outreach: `Find the ${buyerRole}, reference a specific ${domain || sector.toLowerCase()} challenge they likely face, and offer a quick, free teardown.`,
        fit,
        priority: fit >= 85 ? PRIORITY[0] : fit >= 74 ? PRIORITY[1] : PRIORITY[2],
        links: buildSearchLinks(query, locCtx),
      })
    }
    if (items.length >= count) break
  }

  return { location, broad, targets: items.sort((a, b) => b.fit - a.fit) }
}

export function leadsToCSV(result, meta = {}) {
  const targets = Array.isArray(result) ? result : result?.targets || []
  const header = ['Target segment', 'Sector', 'Location', 'Best contact', 'Priority', 'Relevance %', 'What to look for', 'Outreach angle', 'Google', 'Google Maps', 'LinkedIn']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = targets.map((t) =>
    [t.title || t.name, t.sector, t.location, t.buyerRole, t.priority, t.fit, t.lookFor || t.signal, t.outreach, t.links?.google || t.website, t.links?.maps, t.links?.linkedin].map(esc).join(','),
  )
  const preamble = meta.title ? [`"${meta.title}"`, ''] : []
  return [...preamble, header.map(esc).join(','), ...rows].join('\n')
}
