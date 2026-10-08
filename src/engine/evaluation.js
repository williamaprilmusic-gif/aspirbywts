// ============================================================================
//  Aspir by WTS — Business Evaluation (Health Check)
//  A scored self-assessment across the dimensions of a real business. Surfaces
//  where it's strong vs. weak and generates prioritized, actionable fixes.
//  Ratings are 1 (poor) … 5 (excellent). Deterministic + pure.
// ============================================================================

export const EVAL_DIMENSIONS = [
  {
    key: 'product',
    label: 'Product & Offer',
    weight: 1.2,
    questions: [
      { id: 'product-1', text: 'We have a clear, differentiated value proposition', fix: 'Sharpen one sentence: who it\'s for, the outcome, and why you beat the alternative. Test it on 5 customers.' },
      { id: 'product-2', text: 'Our product solves a real, urgent customer pain', fix: 'Run 10 problem interviews; cut features that don\'t map to a top-3 pain.' },
      { id: 'product-3', text: 'Pricing reflects our value and is profitable', fix: 'Re-price against value delivered, add a higher tier, and verify margin per sale.' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing & Brand',
    weight: 1,
    questions: [
      { id: 'marketing-1', text: 'We generate leads consistently from marketing', fix: 'Pick ONE channel and post/publish on a fixed weekly cadence for 8 weeks before judging it.' },
      { id: 'marketing-2', text: 'Our brand and messaging are clear and recognizable', fix: 'Define 3 message pillars and apply them consistently across site, social, and sales.' },
      { id: 'marketing-3', text: 'We attract our ideal customers (not just anyone)', fix: 'Write content for the exact ICP; add a lead magnet that only your ideal buyer would want.' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales & Pipeline',
    weight: 1.1,
    questions: [
      { id: 'sales-1', text: 'We have a predictable, repeatable sales process', fix: 'Document your stages (lead → qualified → proposal → close) and track movement weekly.' },
      { id: 'sales-2', text: 'Our pipeline and conversion rate are healthy', fix: 'Measure conversion at each stage; fix the biggest drop-off before adding more leads.' },
      { id: 'sales-3', text: 'We know our CAC and it is sustainable vs. LTV', fix: 'Calculate CAC and LTV; aim for LTV:CAC ≥ 3 before scaling paid acquisition.' },
    ],
  },
  {
    key: 'finance',
    label: 'Financial Health',
    weight: 1.3,
    questions: [
      { id: 'finance-1', text: 'Our cash flow is positive or clearly improving', fix: 'Build a simple 13-week cash flow; cut or delay non-essential spend this month.' },
      { id: 'finance-2', text: 'We know our margins and unit economics', fix: 'Compute gross margin per product/service; drop or re-price anything below target.' },
      { id: 'finance-3', text: 'We have 3+ months of cash runway / reserves', fix: 'Set a reserve target and automate a transfer; raise prices or trim fixed costs to fund it.' },
    ],
  },
  {
    key: 'customer',
    label: 'Customer & Retention',
    weight: 1.1,
    questions: [
      { id: 'customer-1', text: 'Customers are satisfied (high NPS / reviews)', fix: 'Ask for NPS after delivery; personally follow up with every detractor within 48h.' },
      { id: 'customer-2', text: 'We retain customers well (repeat / low churn)', fix: 'Map the first-30-day experience; add an onboarding touch and a win-back for churned accounts.' },
      { id: 'customer-3', text: 'We have an active feedback loop with customers', fix: 'Run a monthly 15-min call with 3 customers; log themes and ship one improvement from them.' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations & Systems',
    weight: 1,
    questions: [
      { id: 'operations-1', text: 'Our core processes are documented and repeatable', fix: 'Write SOPs for your 3 most-repeated tasks so anyone can run them.' },
      { id: 'operations-2', text: 'We use the right tools/automation (little busywork)', fix: 'List weekly manual tasks; automate or template the top 2 time-sinks.' },
      { id: 'operations-3', text: 'We could handle 2x volume without breaking', fix: 'Identify the first bottleneck at 2x and fix it before it becomes urgent.' },
    ],
  },
  {
    key: 'team',
    label: 'Team & Leadership',
    weight: 1,
    questions: [
      { id: 'team-1', text: 'We have the right people in the right roles', fix: 'Map each core function to an owner; fill or outsource the biggest gap first.' },
      { id: 'team-2', text: 'Ownership and accountability are clear', fix: 'Give every key metric a single named owner; review owners\' numbers weekly.' },
      { id: 'team-3', text: 'The founder is not a bottleneck on everything', fix: 'Delegate one recurring founder task this month with an SOP and a check-in cadence.' },
    ],
  },
  {
    key: 'growth',
    label: 'Growth & Strategy',
    weight: 1.1,
    questions: [
      { id: 'growth-1', text: 'We have a clear strategy and top priorities', fix: 'Pick 1–3 priorities for the next 90 days and say no to the rest, in writing.' },
      { id: 'growth-2', text: 'We have multiple growth levers, not one fragile channel', fix: 'De-risk: start testing a second acquisition channel before the first one saturates.' },
      { id: 'growth-3', text: 'We track the metrics that actually matter', fix: 'Choose one North Star metric + 3 inputs; review them on a weekly dashboard.' },
    ],
  },
]

export const EVAL_QUESTIONS = EVAL_DIMENSIONS.flatMap((d) => d.questions.map((q) => ({ ...q, dimension: d.key, dimensionLabel: d.label })))

export function defaultEvalAnswers() {
  const a = {}
  EVAL_QUESTIONS.forEach((q) => (a[q.id] = 3)) // neutral baseline
  return a
}

export function band(score) {
  if (score >= 70) return { label: 'Strong', color: 'emerald' }
  if (score >= 50) return { label: 'Okay', color: 'amber' }
  return { label: 'Needs work', color: 'rose' }
}

export function scoreEvaluation(answers = {}) {
  const a = { ...defaultEvalAnswers(), ...answers }
  const dimensions = EVAL_DIMENSIONS.map((d) => {
    const vals = d.questions.map((q) => Number(a[q.id]) || 0)
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length
    const score = Math.round((avg / 5) * 100)
    return { key: d.key, label: d.label, weight: d.weight, score, band: band(score) }
  })
  const wsum = dimensions.reduce((s, d) => s + d.weight, 0)
  const overall = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / wsum)

  const sorted = [...dimensions].sort((x, y) => y.score - x.score)
  const strengths = sorted.filter((d) => d.score >= 70).slice(0, 3)
  const weaknesses = sorted.filter((d) => d.score < 60).slice(-3).reverse()

  return { dimensions, overall, overallBand: band(overall), strengths, weaknesses }
}

// Prioritized improvement ideas: lowest-rated questions first.
export function recommendations(answers = {}, limit = 8) {
  const a = { ...defaultEvalAnswers(), ...answers }
  const items = EVAL_QUESTIONS
    .map((q) => ({
      dimension: q.dimension,
      dimensionLabel: q.dimensionLabel,
      text: q.text,
      fix: q.fix,
      rating: Number(a[q.id]) || 0,
    }))
    .filter((x) => x.rating <= 3)
    .sort((x, y) => x.rating - y.rating)
    .map((x) => ({
      ...x,
      severity: x.rating <= 2 ? 'High' : 'Medium',
    }))
  return items.slice(0, limit)
}

export function evaluationToMarkdown(answers = {}, meta = {}) {
  const res = scoreEvaluation(answers)
  const recs = recommendations(answers, 100)
  const lines = []
  lines.push(`# Business Evaluation${meta.name ? ` — ${meta.name}` : ''}`)
  lines.push(`_Overall health: ${res.overall}% (${res.overallBand.label}) · generated by Aspir by WTS_`)
  lines.push('')
  lines.push('## Scores by dimension')
  lines.push('| Dimension | Score | Status |')
  lines.push('| --- | --- | --- |')
  res.dimensions.forEach((d) => lines.push(`| ${d.label} | ${d.score}% | ${d.band.label} |`))
  lines.push('')
  if (res.strengths.length) {
    lines.push('## Strengths')
    res.strengths.forEach((d) => lines.push(`- ${d.label} (${d.score}%)`))
    lines.push('')
  }
  if (res.weaknesses.length) {
    lines.push('## Weakest areas')
    res.weaknesses.forEach((d) => lines.push(`- ${d.label} (${d.score}%)`))
    lines.push('')
  }
  lines.push('## Prioritized improvement ideas')
  recs.forEach((r, i) => lines.push(`${i + 1}. **[${r.severity}] ${r.dimensionLabel}:** ${r.fix}`))
  return lines.join('\n')
}
