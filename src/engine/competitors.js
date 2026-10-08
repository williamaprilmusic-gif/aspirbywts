// ============================================================================
//  Aspir by WTS — Competitive Landscape Snapshot
//  Deterministic generator: synthesizes a plausible competitive map and the
//  gaps the founder can exploit, derived from the blueprint's model + domain.
// ============================================================================

const hashStr = (str = '') => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

const ARCHETYPES = {
  'b2b-saas': [
    { type: 'Enterprise incumbent', strength: 'Brand trust & deep feature set', weakness: 'Slow, expensive, generic — not built for your niche' },
    { type: 'Horizontal all-rounder', strength: 'Broad integrations', weakness: 'Shallow in your specific domain' },
    { type: 'Legacy / spreadsheet status quo', strength: 'Free & familiar', weakness: 'Manual, error-prone, doesn\'t scale' },
  ],
  'micro-saas': [
    { type: 'Bloated suite', strength: 'Does everything', weakness: 'Overkill & overpriced for one job' },
    { type: 'Free tool', strength: 'Zero cost', weakness: 'No support, limits, ads' },
    { type: 'DIY / manual', strength: 'No new tool to learn', weakness: 'Wastes hours weekly' },
  ],
  ecommerce: [
    { type: 'Big-box marketplace brand', strength: 'Price & logistics', weakness: 'No story, no community, commoditized' },
    { type: 'Established DTC brand', strength: 'Audience & capital', weakness: 'Mass-market, not your niche' },
    { type: 'Cheap import sellers', strength: 'Lowest price', weakness: 'Poor quality & experience' },
  ],
  agency: [
    { type: 'Big-name agency', strength: 'Prestige & scale', weakness: 'Expensive, junior execution, slow' },
    { type: 'Offshore / cheap shop', strength: 'Low rates', weakness: 'Low quality, comms gaps' },
    { type: 'Freelancer', strength: 'Cheap & flexible', weakness: 'No bandwidth or strategy' },
  ],
  consulting: [
    { type: 'Big consultancy', strength: 'Brand & frameworks', weakness: 'Generic decks, no execution, costly' },
    { type: 'Generalist advisor', strength: 'Accessible', weakness: 'Lacks your specific depth' },
    { type: 'Internal hire', strength: 'Dedicated', weakness: 'Slow to hire, expensive, single perspective' },
  ],
  'digital-products': [
    { type: 'Mega course platform', strength: 'Catalogue & reach', weakness: 'Generic, no community, outdated' },
    { type: 'Free content (YouTube/blogs)', strength: 'Free', weakness: 'Unstructured, no accountability' },
    { type: 'Established creator', strength: 'Audience', weakness: 'Not tailored to your niche angle' },
  ],
}

export function generateCompetitors(blueprint) {
  if (!blueprint) return null
  const model = blueprint.intake?.targetModel || 'b2b-saas'
  const domain = blueprint.concept?.domain || 'your domain'
  const base = ARCHETYPES[model] || ARCHETYPES['b2b-saas']
  const seed = hashStr(blueprint.concept?.productName || model)

  const competitors = base.map((c, i) => ({
    ...c,
    // deterministic pseudo price/focus positioning for a 2x2 map
    price: ((hashStr(c.type + seed) % 100) / 100) * 0.8 + 0.1, // 0.1 - 0.9
    focus: ((hashStr(c.weakness + seed + i) % 100) / 100) * 0.8 + 0.1,
  }))

  // The founder's own position: high domain focus, mid price
  const you = {
    type: `${blueprint.concept?.productName || 'You'} (you)`,
    price: 0.55,
    focus: 0.92,
    strength: 'Operator-built, niche-deep, fast & personal',
    weakness: 'New entrant — must build trust & proof',
    isYou: true,
  }

  const gaps = [
    `No incumbent combines deep ${domain} specialisation with your speed and personal touch.`,
    `Competitors win on brand or price — you win on fit and lived experience.`,
    `Position above the cheap/generic options and below the slow enterprise players: premium value without enterprise bloat.`,
  ]

  const wedges = [
    `Lead with a sharp niche: own "${domain}" before broadening.`,
    `Turn your background into proof — competitors can't copy your story.`,
    `Out-personal the big players and out-quality the cheap ones.`,
  ]

  return { competitors: [...competitors, you], gaps, wedges, domain }
}
