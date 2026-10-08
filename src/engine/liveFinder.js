// ============================================================================
//  Aspir by WTS — Live company lookup (real names, no API key, no backend)
//  Uses OpenStreetMap: Nominatim to geocode the city/country, then Overpass to
//  list real, named businesses nearby. Runs client-side from the browser.
//  Pure helpers (query builder + element mapper) are unit-tested; the network
//  call degrades gracefully to the search-link launchpad when unreachable.
// ============================================================================

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS = 'https://overpass-api.de/api/interpreter'

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

// Turn raw Overpass elements into ranked, de-duplicated company records.
export function mapElements(elements = [], { industry = '', location = '' } = {}) {
  const keywords = industry
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set()
  const out = []
  for (const el of elements) {
    const t = el.tags || {}
    const name = (t.name || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const kind =
      t.office || t.shop || t.craft || t.industrial || t.amenity || 'business'
    const website = t.website || t['contact:website'] || t.url || ''
    const phone = t.phone || t['contact:phone'] || ''
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city']]
      .filter(Boolean)
      .join(' ')
    const haystack = `${name} ${kind} ${t.description || ''}`.toLowerCase()
    const matches = keywords.filter((k) => haystack.includes(k)).length
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon

    out.push({
      name,
      kind: String(kind).replace(/_/g, ' '),
      website,
      phone,
      address,
      location,
      lat,
      lon,
      relevance: matches,
    })
  }

  // Keyword matches first, then ones with a website, then alphabetically.
  out.sort((a, b) => b.relevance - a.relevance || (b.website ? 1 : 0) - (a.website ? 1 : 0) || a.name.localeCompare(b.name))
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
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
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
  const data = await fetchJSON(url, { headers: { Accept: 'application/json' } }, 15000)
  if (!Array.isArray(data) || !data.length) throw new Error('Location not found')
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name }
}

// Main entry: returns { location, lat, lon, companies: [...] } or throws.
export async function findRealCompanies({ city = '', country = '', industry = '', limit = 24 } = {}) {
  const geo = await geocode(city, country)
  const query = buildOverpassQuery(geo.lat, geo.lon, 14000)
  const data = await fetchJSON(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  }, 25000)
  const location = [city, country].filter(Boolean).join(', ')
  const companies = mapElements(data.elements || [], { industry, location }).slice(0, limit)
  return { location, lat: geo.lat, lon: geo.lon, companies }
}
