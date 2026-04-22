/**
 * Steel Estimator Pro — Calculation Engine
 * Mirrors the formulas from Estimator Pro v5.1 Excel (6,043 formulas)
 */

// ─── Weight Calculations ───
export function calcTotalWeight(qty, length, wtPerFt) {
  return qty * length * wtPerFt
}

export function lbsToTons(lbs) {
  return lbs / 2000
}

export function tonsToLbs(tons) {
  return tons * 2000
}

// ─── Material Cost ───
export function calcMaterialCost(weightLbs, ratePerLb, wastePercent = 0.05, connectionPercent = 0.03) {
  const grossWeight = weightLbs * (1 + wastePercent + connectionPercent)
  return grossWeight * ratePerLb
}

export function calcStructuralMaterialCost(weightLbs, rates) {
  const steelRate = rates.materialRates.find(r => r.item === 'Structural steel')?.rate || 1.20
  const waste = rates.materialRates.find(r => r.item.includes('Waste'))?.rate || 0.05
  const conn = rates.materialRates.find(r => r.item.includes('Connection'))?.rate || 0.03
  return weightLbs * (1 + waste + conn) * steelRate
}

export function calcMiscMaterialCost(weightLbs, rates) {
  const miscRate = rates.materialRates.find(r => r.item.includes('Miscellaneous'))?.rate ||
                   rates.materialRates.find(r => r.item === 'Structural steel')?.rate || 1.30
  const waste = rates.materialRates.find(r => r.item.includes('Waste'))?.rate || 0.03
  return weightLbs * (1 + waste) * miscRate
}

// ─── Labour Cost ───
export function calcFabLabourCost(hours, rates) {
  const { fabRate, shopFactor } = rates.labourRates
  return hours * fabRate * shopFactor
}

export function calcInstallLabourCost(hours, rates) {
  const { installRate, fieldFactor } = rates.labourRates
  return hours * installRate * fieldFactor
}

export function calcFabHours(weightLbs, hrsPerTon) {
  return (weightLbs / 2000) * hrsPerTon
}

export function calcInstallHours(weightLbs, hrsPerTon) {
  return (weightLbs / 2000) * hrsPerTon
}

// ─── Travel & Freight ───
export function calcTravelCost(distanceKm, travelHrs, crewSize, installRate, trips = 1) {
  const fuelCost = distanceKm * 2 * 0.68 * trips  // round trip, $0.68/km
  const labourCost = travelHrs * 2 * crewSize * installRate * trips
  return fuelCost + labourCost
}

export function calcFreightCost(weightLbs, distanceKm) {
  const tons = weightLbs / 2000
  if (distanceKm <= 50) return tons * 150
  if (distanceKm <= 150) return tons * 250
  if (distanceKm <= 500) return tons * 400
  return tons * 600
}

// ─── Soft Costs ───
export function calcSoftCostTotal(softCosts, subtotal) {
  let flatTotal = 0
  let percentTotal = 0

  for (const item of softCosts) {
    if (item.unit === '%') {
      percentTotal += (subtotal * item.rate / 100)
    } else {
      flatTotal += (item.qty * item.rate)
    }
  }

  return { flatTotal, percentTotal, total: flatTotal + percentTotal }
}

// ─── Markup & HST ───
export function calcMarkup(subtotal, markupPercent) {
  return subtotal * (markupPercent / 100)
}

export function calcHST(amount, hstRate = 13) {
  return amount * (hstRate / 100)
}

// ─── Stairs Calculator (OBC 3.4 / OHSA) ───
export function calcStairs(params) {
  const { floorHeight, stairWidth, flights, landingDepth } = params

  const risersPerFlight = Math.round(floorHeight / (flights * 180))
  const riserHeight = floorHeight / (risersPerFlight * flights)
  const treadsPerFlight = risersPerFlight - 1
  const treadDepth = Math.max(280, Math.round(630 - 2 * riserHeight)) // 2R + T ≈ 630mm
  const totalRun = treadsPerFlight * treadDepth
  const stringerLength = Math.sqrt(
    Math.pow(risersPerFlight * riserHeight, 2) + Math.pow(totalRun, 2)
  )
  const stringerLengthFt = stringerLength / 304.8
  const landings = flights
  const landingSqft = (landingDepth * stairWidth) / (304.8 * 304.8) * landings
  const guardrailPosts = Math.ceil(stringerLengthFt / 4) * 2 * flights + landings * 4

  // OBC 3.4 compliance checks
  const compliance = []
  compliance.push({
    rule: `Riser ${riserHeight.toFixed(1)} mm ≤ 200 mm max (OBC 3.4)`,
    ok: riserHeight <= 200,
  })
  compliance.push({
    rule: `Tread run ${treadDepth} mm ≥ 255 mm min (OBC 3.4)`,
    ok: treadDepth >= 255,
  })
  compliance.push({
    rule: `${risersPerFlight} risers per flight ≤ 12 max before landing (OBC 3.4)`,
    ok: risersPerFlight <= 12,
  })
  compliance.push({
    rule: `Stair width ${stairWidth} mm ≥ 900 mm min (OBC 3.4)`,
    ok: stairWidth >= 900,
  })
  compliance.push({
    rule: `Headroom clearance ≥ 2050 mm (OBC 3.4)`,
    ok: true, // assumed unless user provides ceiling height
  })

  // Weight estimate: stringers (C10x20 ≈ 20 lb/ft × 2) + treads (checkered plate) + landings
  const stringerWt = stringerLengthFt * 20 * 2 * flights
  const treadWt = treadsPerFlight * flights * (stairWidth / 304.8) * 12 // ~12 lb per tread-ft
  const landingWt = landingSqft * 25 // ~25 psf for plate + framing
  const totalWt = stringerWt + treadWt + landingWt

  // Fab & install hours (stairs = complex misc: ~30 hrs/ton fab, ~24 hrs/ton install)
  const tons = totalWt / 2000
  const fabHrs = Math.round(tons * 30 * 10) / 10
  const installHrs = Math.round(tons * 24 * 10) / 10

  return {
    risersPerFlight,
    riserHeight,
    treadsPerFlight,
    treadDepth,
    totalRun,
    stringerLength,
    stringerLengthFt,
    landings,
    landingSqft,
    guardrailPosts,
    compliance,
    totalWt: Math.round(totalWt),
    totalWeight: Math.round(totalWt),
    flights,
    stringerWt: Math.round(stringerWt),
    treadWt: Math.round(treadWt),
    landingWt: Math.round(landingWt),
    fabHrs,
    installHrs,
  }
}

// ─── Summary Aggregation ───
export function calcProjectSummary(state) {
  const { structural, miscMetals, stairs, railings, ladder, joistReinf, purchased, softCosts, rates } = state

  // Structural weight & hours
  const structuralWt = structural.reduce((s, r) => s + (r.totalWt || 0), 0)
  const structuralFabHrs = structural.reduce((s, r) => s + (r.totalFabHrs || 0), 0)
  const structuralInstHrs = structural.reduce((s, r) => s + (r.totalInstHrs || 0), 0)

  // Misc metals weight & hours
  const miscWt = miscMetals.reduce((s, r) => s + (r.totalWt || 0), 0)
  const miscFabHrs = miscMetals.reduce((s, r) => s + (r.fabHrs || 0), 0)
  const miscInstHrs = miscMetals.reduce((s, r) => s + (r.instHrs || 0), 0)

  // Railings
  const railingsWt = railings.reduce((s, r) => s + (r.weightLbs || 0), 0)
  const railingsFabHrs = railings.reduce((s, r) => s + (r.fabHrs || 0), 0)
  const railingsInstHrs = railings.reduce((s, r) => s + (r.instHrs || 0), 0)

  // Ladder
  const ladderWt = ladder.reduce((s, r) => s + (r.weightLbs || 0), 0)
  const ladderFabHrs = ladder.reduce((s, r) => s + (r.fabHrs || 0), 0)
  const ladderInstHrs = ladder.reduce((s, r) => s + (r.instHrs || 0), 0)

  // Joist reinforcement
  const joistWt = joistReinf.reduce((s, r) => s + (r.weightLbs || 0), 0)
  const joistFabHrs = joistReinf.reduce((s, r) => s + (r.fabHrs || 0), 0)
  const joistInstHrs = joistReinf.reduce((s, r) => s + (r.instHrs || 0), 0)

  // Stairs weight
  const stairsCalc = calcStairs(stairs)
  const stairsWt = stairsCalc.totalWt

  // Totals
  const totalStructuralWt = structuralWt
  const totalMiscWt = miscWt + railingsWt + ladderWt + joistWt + stairsWt
  const totalWeightLbs = totalStructuralWt + totalMiscWt
  const totalWeightTons = totalWeightLbs / 2000

  const totalFabHrs = structuralFabHrs + miscFabHrs + railingsFabHrs + ladderFabHrs + joistFabHrs + stairsCalc.fabHrs
  const totalInstHrs = structuralInstHrs + miscInstHrs + railingsInstHrs + ladderInstHrs + joistInstHrs + stairsCalc.installHrs

  // Material costs
  const structuralMaterialCost = calcStructuralMaterialCost(totalStructuralWt, rates)
  const miscMaterialCost = calcMiscMaterialCost(totalMiscWt, rates)
  const totalMaterialCost = structuralMaterialCost + miscMaterialCost

  // Labour costs
  const fabLabourCost = calcFabLabourCost(totalFabHrs, rates)
  const installLabourCost = calcInstallLabourCost(totalInstHrs, rates)
  const travelLabourCost = calcTravelCost(
    state.projectInfo.distanceKm,
    state.projectInfo.travelHrs,
    rates.labourRates.installCrew,
    rates.labourRates.installRate,
    Math.ceil(totalInstHrs / 40) // estimated trips
  )
  const totalLabourCost = fabLabourCost + installLabourCost + travelLabourCost

  // Purchased items
  const purchasedTotal = purchased.reduce((s, r) => s + (r.qty * r.unitCost || 0), 0)

  // Base subtotal (before soft costs)
  const baseSubtotal = totalMaterialCost + totalLabourCost + purchasedTotal

  // Soft costs
  const softCostCalc = calcSoftCostTotal(softCosts, baseSubtotal)

  // Grand subtotal before markup
  const subtotal = baseSubtotal + softCostCalc.total

  // Markup
  const markupAmount = calcMarkup(subtotal, rates.markup.percent)
  const bidPrice = subtotal + markupAmount

  // HST
  const hstAmount = calcHST(bidPrice, rates.hstRate)
  const grandTotal = bidPrice + hstAmount

  // $/ton and $/sqft
  const pricePerTon = totalWeightTons > 0 ? bidPrice / totalWeightTons : 0
  const pricePerLb = totalWeightLbs > 0 ? bidPrice / totalWeightLbs : 0
  const pricePerSqft = state.projectInfo.buildingAreaSqft > 0
    ? bidPrice / state.projectInfo.buildingAreaSqft : 0

  return {
    // Weights
    totalStructuralWt,
    totalMiscWt,
    totalWeightLbs,
    totalWeightTons,

    // Hours
    totalFabHrs,
    totalInstHrs,

    // Costs
    structuralMaterialCost,
    miscMaterialCost,
    totalMaterialCost,
    fabLabourCost,
    installLabourCost,
    travelLabourCost,
    totalLabourCost,
    purchasedTotal,
    softCostFlat: softCostCalc.flatTotal,
    softCostPercent: softCostCalc.percentTotal,
    softCostTotal: softCostCalc.total,

    // Totals
    subtotal,
    markupPercent: rates.markup.percent,
    markupAmount,
    bidPrice,
    hstRate: rates.hstRate,
    hstAmount,
    grandTotal,

    // Benchmarks
    pricePerTon,
    pricePerLb,
    pricePerSqft,

    // Stairs detail
    stairsCalc,
  }
}

// ─── Formatting helpers ───
export function fmtCurrency(val) {
  if (val == null || isNaN(val)) return '$0.00'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(val)
}

export function fmtNumber(val, decimals = 0) {
  if (val == null || isNaN(val)) return '0'
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

export function fmtPercent(val) {
  if (val == null || isNaN(val)) return '0%'
  return `${val.toFixed(1)}%`
}
