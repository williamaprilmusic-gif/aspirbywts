// ============================================================================
//  Aspir by WTS — Live company lookup (real names, no API key, no backend)
//  Uses OpenStreetMap: Nominatim to geocode the city/country, then Overpass to
//  list real, named businesses nearby. Runs client-side from the browser.
//  Pure helpers (query builder + element mapper) are unit-tested; the network
//  call degrades gracefully to the search-link launchpad when unreachable.
// ============================================================================

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export function buildOverpassQuery(lat, lon, radius = 12000) {
  const r = Math.round(radius)
  const a = `(around:${r},${lat},${lon})`
  return `[out:json][timeout:25];
(
  node${a}["name"]["office"];
  way${a}["name"]["office"];
  node${a}["name"]["industrial"];
  way${a}["name"]["industrial"];
  node${a}["name"]["craft"];
  way${a}["name"]["shop"];
  node${a}["name"]["amenity"~"^(coworking_space|company)$"];
);
out tags center 200;`
}

// Words too generic to be useful for industry matching — they appear in
// company names of every sector ("… Group", "… Services") or are the overly
// broad half of a phrase ("call CENTRE" also matches "shopping centre").
const STOPWORDS = new Set([
  'centre', 'center', 'group', 'services', 'service', 'company', 'co', 'ltd',
  'pty', 'inc', 'llc', 'the', 'and', 'of', 'solutions', 'systems', 'business',
  'enterprise', 'enterprises', 'holdings', 'international', 'global', 'local',
])

export function industryKeywords(industry = '') {
  return industry
    .toLowerCase()
    .split(/[\s,;/&]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !STOPWORDS.has(s))
}

// Each business model sells to a particular kind of customer. These tokens
// describe the OSM categories of that ideal customer, so the model can narrow
// the company list to businesses you could realistically sell to — matched the
// same whole-word way as industry keywords (against name + category tags).
const MODEL_TARGETS = {
  'b2b-saas': ['office', 'company', 'it', 'software', 'finance', 'financial', 'insurance', 'logistics', 'consulting', 'telecommunication', 'coworking', 'accountant', 'lawyer', 'estate_agent'],
  'micro-saas': ['office', 'company', 'it', 'software', 'coworking', 'startup', 'consulting', 'accountant', 'estate_agent'],
  ecommerce: ['shop', 'retail', 'wholesale', 'boutique', 'supermarket', 'convenience', 'trade', 'clothes', 'electronics', 'cosmetics'],
  agency: ['shop', 'restaurant', 'cafe', 'retail', 'hotel', 'hairdresser', 'beauty', 'fitness', 'clinic', 'dentist', 'car_repair', 'estate_agent'],
  consulting: ['office', 'company', 'manufacturer', 'industrial', 'factory', 'logistics', 'finance', 'financial', 'insurance', 'government'],
  'digital-products': ['office', 'company', 'school', 'college', 'university', 'training', 'coworking', 'it', 'software'],
  // Service sold to employers with lots of staff (transport, cleaning, security,
  // catering…). Targets large-headcount workplaces across sectors.
  'local-service': ['office', 'company', 'industrial', 'factory', 'manufacturer', 'warehouse', 'logistics', 'hospital', 'clinic', 'hotel', 'school', 'college', 'university', 'telecommunication'],
}

export function modelTargets(model = '') {
  return MODEL_TARGETS[model] || []
}

// Categories of workplace that typically run night / early / rotating shifts,
// so their staff need transport to and from work when public transport doesn't
// run. Used to flag prime targets for a staff-shuttle service.
const SHIFT_KINDS = [
  'hospital', 'clinic', 'factory', 'manufacturer', 'industrial', 'warehouse',
  'logistics', 'telecommunication', 'security', 'bakery', 'mine', 'fuel',
  'airport', 'casino', 'hotel', 'distribution', 'cannery', 'brewery',
]
// Name hints that strongly imply round-the-clock or shift operations.
const SHIFT_NAME_HINTS = ['call centre', 'call center', 'bpo', '24/7', '24 hour', 'nightshift', 'night shift', 'distribution centre', 'distribution center', 'fulfils', 'fulfilment', 'fulfillment']

// Decide whether an OSM element looks like a shift-work employer.
export function isShiftEmployer(tags = {}, tokens = new Set(), name = '') {
  const hours = (tags.opening_hours || '').toLowerCase()
  if (hours.includes('24/7')) return true
  if (SHIFT_KINDS.some((k) => tokens.has(k))) return true
  const lname = name.toLowerCase()
  return SHIFT_NAME_HINTS.some((h) => lname.includes(h))
}

// Turn raw Overpass elements into ranked, de-duplicated company records.
// When an industry is given, `relevance` counts whole-word keyword hits so the
// caller can filter to real matches rather than merely re-ordering everything.
export function mapElements(elements = [], { industry = '', model = '', location = '' } = {}) {
  const keywords = industryKeywords(industry)
  const targets = modelTargets(model)

  const seenKeys = new Set() // name@coords — exact place
  const seenNames = new Set() // name alone — for records lacking coords
  const out = []
  for (const el of elements) {
    const t = el.tags || {}
    const name = (t.name || '').trim()
    if (!name) continue
    // Dedupe on name + rough location so a multi-branch chain keeps each branch
    // and two different firms sharing a name aren't collapsed — while an exact
    // duplicate (OSM often returns a node and a way for one place) still drops.
    const lname = name.toLowerCase()
    const elat = el.lat ?? el.center?.lat
    const elon = el.lon ?? el.center?.lon
    if (elat != null && elon != null) {
      const key = `${lname}@${elat.toFixed(3)},${elon.toFixed(3)}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
    } else {
      // No coordinates to disambiguate — fall back to name-only dedupe.
      if (seenNames.has(lname)) continue
    }
    seenNames.add(lname)

    const kind =
      t.office || t.shop || t.craft || t.industrial || t.amenity || 'business'
    const website = t.website || t['contact:website'] || t.url || ''
    const phone = t.phone || t['contact:phone'] || ''
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city']]
      .filter(Boolean)
      .join(' ')
    // Whole-word match against name, the OSM category tags, and the description.
    const tokens = new Set(
      `${name} ${kind} ${t.office || ''} ${t.shop || ''} ${t.craft || ''} ${t.industry || ''} ${t.description || ''}`
        .toLowerCase()
        .split(/[\s,;/&_-]+/)
        .filter(Boolean),
    )
    const industryMatch = keywords.filter((k) => tokens.has(k)).length
    let modelMatch = targets.filter((k) => tokens.has(k)).length
    // When the model targets retail ("shop"), count ANY shop as a match even
    // if its specific sub-type (outdoor, department_store, …) isn't enumerated.
    // Scoped to `shop` only, so offices tagged ngo/charity stay excluded.
    if (modelMatch === 0 && t.shop && targets.includes('shop')) modelMatch = 1
    const matches = industryMatch + modelMatch
    const shift = isShiftEmployer(t, tokens, name)

    out.push({
      name,
      kind: String(kind).replace(/_/g, ' '),
      website,
      phone,
      address,
      location,
      lat: elat,
      lon: elon,
      relevance: matches,
      shift,
    })
  }

  // Keyword matches first, then shift employers, then website, then alpha.
  out.sort(
    (a, b) =>
      b.relevance - a.relevance ||
      (b.shift ? 1 : 0) - (a.shift ? 1 : 0) ||
      (b.website ? 1 : 0) - (a.website ? 1 : 0) ||
      a.name.localeCompare(b.name),
  )
  return out
}

export function companyLinks(company, { city = '', country = '' } = {}) {
  const loc = [city, country].filter(Boolean).join(' ')
  const q = encodeURIComponent(`${company.name} ${loc}`.trim())
  return {
    website: company.website || `https://www.google.com/search?q=${q}`,
    maps:
      company.lat && company.lon
        ? `https://www.google.com/maps/search/?api=1&query=${company.lat},${company.lon}`
        : `https://www.google.com/maps/search/${q}`,
    search: `https://www.google.com/search?q=${q}`,
  }
}

async function fetchJSON(url, opts, ms = 20000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { cache: 'no-store', ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function geocode(city, country) {
  const q = [city, country].filter(Boolean).join(', ')
  if (!q) throw new Error('No location')
  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`
  let data
  try {
    data = await fetchJSON(url, { headers: { Accept: 'application/json' } }, 15000)
  } catch (e) {
    throw new Error(`Could not reach the map service (${e.message})`)
  }
  if (!Array.isArray(data) || !data.length) throw new Error(`Couldn't find "${q}" — check the spelling`)
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name }
}

// Query several Overpass mirrors until one answers.
async function overpass(query) {
  let lastErr
  for (const url of OVERPASS_MIRRORS) {
    try {
      return await fetchJSON(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` },
        25000,
      )
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`Company directory is busy right now (${lastErr ? lastErr.message : 'no response'})`)
}

// Main entry: returns { location, lat, lon, companies: [...] } or throws.
export async function findRealCompanies({ city = '', country = '', industry = '', model = '', limit = 24, radius = 14000, shiftOnly = false } = {}) {
  const geo = await geocode(city, country)
  const query = buildOverpassQuery(geo.lat, geo.lon, radius)
  const data = await overpass(query)
  const location = [city, country].filter(Boolean).join(', ')
  let all = mapElements(data.elements || [], { industry, model, location })

  // Shift-work focus: keep only employers that likely run night/odd shifts —
  // the businesses whose staff need transport when buses/taxis don't run.
  const shiftMatched = all.filter((c) => c.shift)
  const shiftApplied = shiftOnly && shiftMatched.length > 0
  if (shiftApplied) all = shiftMatched

  // Narrow to real matches when the industry and/or the business model give us
  // something to match on — never pad the list with unrelated businesses
  // (malls, NGOs, …). The model contributes its ideal-customer categories.
  const hasFilter = industryKeywords(industry).length > 0 || modelTargets(model).length > 0
  const matched = all.filter((c) => c.relevance > 0)
  const filtered = hasFilter && matched.length > 0
  const companies = (filtered ? matched : all).slice(0, limit)

  return {
    location,
    lat: geo.lat,
    lon: geo.lon,
    companies,
    filtered,
    matchedCount: matched.length,
    shiftApplied,
    shiftCount: shiftMatched.length,
  }
}
