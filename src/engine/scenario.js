// ============================================================================
//  Aspir by WTS — Scenario / What-If Engine
//  Recomputes the 12-month projection and key ratios from live sliders,
//  starting from a blueprint's base economics. Self-consistent break-even:
//  first month where cumulative gross-margin revenue covers cumulative CAC.
// ============================================================================

export function defaultScenario(bp) {
  return {
    priceMult: 1, // 0.5x – 2x on ACV / price
    churnMonthly: bp.economics.churnMonthly, // absolute monthly churn
    cac: bp.economics.cac, // absolute CAC
    growthMult: 1, // multiplier on monthly new-customer acquisition
  }
}

export function computeScenario(bp, s) {
  const grossMargin = bp.economics.grossMargin
  const baseAcv = bp.economics.acv
  const acv = Math.round(baseAcv * s.priceMult)
  const churn = Math.max(0, Math.min(0.5, s.churnMonthly))
  const cac = Math.max(1, Math.round(s.cac))

  const monthlyDeals = []
  let active = 0
  let cumRevenue = 0
  let cumMarginRevenue = 0
  let cumAcqCost = 0
  let breakeven = null

  for (const base of bp.economics.monthlyDeals) {
    const newCustomers = Math.max(0, Math.round(base.newCustomers * s.growthMult))
    if (churn > 0) {
      active = Math.round(active * (1 - churn) + newCustomers)
    } else {
      active += newCustomers
    }
    const revenue = churn > 0 ? Math.round(active * (acv / 12)) : Math.round(newCustomers * acv)

    cumRevenue += revenue
    cumMarginRevenue += revenue * grossMargin
    cumAcqCost += newCustomers * cac
    if (breakeven === null && cumMarginRevenue >= cumAcqCost && cumAcqCost > 0) {
      breakeven = base.month
    }
    monthlyDeals.push({ month: base.month, newCustomers, activeCustomers: active, revenue })
  }

  const ltv =
    churn > 0
      ? Math.round(acv * grossMargin)
      : Math.round(acv * grossMargin * (bp.modelLabel === 'E-commerce' ? 2.4 : 1))
  const ltvCacRatio = cac > 0 ? +(ltv / cac).toFixed(1) : 0

  return {
    acv,
    cac,
    churnMonthly: churn,
    ltv,
    ltvCacRatio,
    grossMargin,
    monthlyDeals,
    year1Gross: cumRevenue,
    breakeven: breakeven || '—',
  }
}
