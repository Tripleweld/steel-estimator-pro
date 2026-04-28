import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { calcStairs } from '../utils/calculations';
import { calcEquipRentalCost } from '../context/ProjectContext';
import {
  FileSpreadsheet, TrendingUp, Weight, Clock, DollarSign, AlertTriangle,
} from 'lucide-react';

const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const toNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

/* --- Plate Library (must match StructuralTakeoff) --- */
const PLATE_WIDTHS = [4, 5, 6, 7, 8, 9, 10, 12, 16, 18];
const PLATE_THICKNESSES = [
  { label: '1/2', value: 0.5 },
  { label: '5/8', value: 0.625 },
  { label: '3/4', value: 0.75 },
];
const PLATE_LIBRARY = [];
PLATE_WIDTHS.forEach(w => {
  PLATE_THICKNESSES.forEach(t => {
    PLATE_LIBRARY.push({
      id: w + 'x' + t.label,
      width: w, thickness: t.value,
      lbsPerFt: Math.round(w * t.value * 3.4028 * 100) / 100,
    });
  });
});

/* --- Hour helpers (match StructuralTakeoff exactly) --- */
function getEffectiveFabPerPc(r) {
  if (r.fabPerPcOverride != null && r.fabPerPcOverride !== '' && r.fabPerPcOverride !== 0)
    return toNum(r.fabPerPcOverride);
  return (toNum(r.setup) + toNum(r.cut) + toNum(r.drill) + toNum(r.feed) + toNum(r.weld) + toNum(r.grind) + toNum(r.paint)) / 60;
}
function getEffectiveInstPerPc(r) {
  if (r.instPerPcOverride != null && r.instPerPcOverride !== '' && r.instPerPcOverride !== 0)
    return toNum(r.instPerPcOverride);
  return (toNum(r.unload) + toNum(r.rig) + toNum(r.fit) + toNum(r.bolt) + toNum(r.touchUp)) / 60;
}

/* --- Row weight helper --- */
function getRowWeight(r) {
  if (r.section === 'moment') {
    const plate = PLATE_LIBRARY.find(p => p.id === r.plateSize);
    const plbsft = plate ? plate.lbsPerFt : 0;
    return r.wtOverride != null ? toNum(r.wtOverride) : toNum(r.plateQty) * plbsft * toNum(r.plateLengthFt);
  }
  return toNum(r.qty) * toNum(r.lengthFt) * toNum(r.wtPerFt);
}

const benchmarks = [
  { label: 'Simple Structural', low: 3500, high: 5500, color: 'bg-emerald-500' },
  { label: 'Commercial + Misc', low: 5500, high: 8000, color: 'bg-sky-500' },
  { label: 'Institutional', low: 8000, high: 12000, color: 'bg-amber-500' },
  { label: 'Heavy Misc Only', low: 10000, high: 18000, color: 'bg-rose-500' },
];

export default function Summary() {
  const { state } = useProject();
  const info = state.projectInfo || {};
  const rates = state.rates || {};

  const summary = useMemo(() => {
    /* === Structural rows (flat array with .section field) === */
    const stRows = state.structuralRows || [];
    const miscMetals = state.miscMetals || [];
    const railings = state.railings || [];
    const ladder = state.ladder || [];
    const joistReinf = state.joistReinf || [];
    const purchased = state.purchased || [];
    const softCosts = state.softCosts || [];
    const equipment = rates.equipment || [];
    const stairs = state.stairs || {};

    /* --- Rates (match StructuralTakeoff paths) --- */
    const labourRates = rates.labourRates || {};
    const fabRate = toNum(labourRates.fabRate) || 50;
    const installRate = toNum(labourRates.installRate) || 55;
    const materialRates = rates.materialRates || [];
    const steelRateEntry = materialRates.find(m => m.item === 'Structural steel');
    const steelRate = toNum(steelRateEntry?.rate) || 1.00;
    const miscRateEntry = materialRates.find(m => m.item === 'Misc metals' || m.item === 'Miscellaneous metals');
    const miscRate = toNum(miscRateEntry?.rate) || steelRate;

    /* --- Structural weights & hours --- */
    let structuralWt = 0, structFabHrs = 0, structInstHrs = 0;
    stRows.forEach(r => {
      const lbs = getRowWeight(r);
      structuralWt += lbs;
      const fabPc = getEffectiveFabPerPc(r);
      const instPc = getEffectiveInstPerPc(r);
      if (r.section === 'moment') {
        structFabHrs += fabPc * (toNum(r.fabCrew) || 1);
        structInstHrs += instPc * (toNum(r.instCrew) || 1);
      } else {
        structFabHrs += fabPc * toNum(r.qty);
        structInstHrs += instPc * toNum(r.qty);
      }
    });

    /* --- Misc Metals --- */
    const miscWt = miscMetals.reduce((s, r) => s + toNum(r.qty) * toNum(r.lengthFt) * toNum(r.lbsPerFt), 0);
    const miscFabHrs = miscMetals.reduce((s, r) => s + toNum(r.qty) * toNum(r.fabHrsPerPc), 0);
    const miscInstHrs = miscMetals.reduce((s, r) => s + toNum(r.qty) * toNum(r.installHrsPerPc), 0);

    /* --- Stairs --- */
    const stairsCalc = calcStairs ? calcStairs(stairs) : { totalWeight: 0, flights: 0 };
    const stairsWt = toNum(stairsCalc.totalWeight);
    const stairsFabHrs = toNum(stairsCalc.fabHrs);
    const stairsInstHrs = toNum(stairsCalc.installHrs);

    /* --- Railings, Ladder, Joist Reinf --- */
    const railingsWt = railings.reduce((s, r) => s + toNum(r.weightLbs), 0);
    const railFabHrs = railings.reduce((s, r) => s + toNum(r.fabHrs), 0);
    const railInstHrs = railings.reduce((s, r) => s + toNum(r.installHrs), 0);
    const ladderWt = ladder.reduce((s, r) => s + toNum(r.weightLbs), 0);
    const ladderFabHrs = ladder.reduce((s, r) => s + toNum(r.fabHrs), 0);
    const ladderInstHrs = ladder.reduce((s, r) => s + toNum(r.installHrs), 0);
    const joistReinfWt = joistReinf.reduce((s, r) => s + toNum(r.weightLbs) * (toNum(r.qty) || 1), 0);
    const joistFabHrs = joistReinf.reduce((s, r) => s + toNum(r.fabHrs), 0);
    const joistInstHrs = joistReinf.reduce((s, r) => s + toNum(r.installHrs), 0);

    /* --- Totals --- */
    const totalWeightLbs = structuralWt + miscWt + stairsWt + railingsWt + ladderWt + joistReinfWt;
    const totalWeightTons = totalWeightLbs / 2000;
    const totalFabHrs = structFabHrs + miscFabHrs + railFabHrs + ladderFabHrs + joistFabHrs + stairsFabHrs;
    const totalInstHrs = structInstHrs + miscInstHrs + railInstHrs + ladderInstHrs + joistInstHrs + stairsInstHrs;

    /* --- Material costs --- */
    const structuralMaterialCost = structuralWt * steelRate;
    const miscMaterialCost = (miscWt + stairsWt + railingsWt + ladderWt + joistReinfWt) * miscRate;
    const totalMaterialCost = structuralMaterialCost + miscMaterialCost;

    /* --- Labour costs --- */
    const fabLabourCost = totalFabHrs * fabRate;
    const installLabourCost = totalInstHrs * installRate;
    const totalLabourCost = fabLabourCost + installLabourCost;

    /* --- Purchased Items (by category) --- */
    const purchasedJoists = purchased.filter(r => r.category === 'joists').reduce((s, r) => s + toNum(r.qty) * toNum(r.unitCost), 0);
    const purchasedDeck = purchased.filter(r => r.category === 'deck').reduce((s, r) => s + toNum(r.qty) * toNum(r.unitCost), 0);
    const purchasedOther = purchased.filter(r => r.category !== 'joists' && r.category !== 'deck').reduce((s, r) => s + toNum(r.qty) * toNum(r.unitCost), 0);
    const purchasedTotal = purchasedJoists + purchasedDeck + purchasedOther;

    /* --- Equipment --- */
    let equipmentTotal = 0;
    equipment.forEach((eq) => {
      if (calcEquipRentalCost) {
        equipmentTotal += toNum(calcEquipRentalCost(eq));
      } else {
        equipmentTotal += (toNum(eq.rate) * toNum(eq.days)) + toNum(eq.pickup) + toNum(eq.dropoff);
      }
    });
    const equipMarkupPct = toNum(rates.markup?.equipmentMarkup);
    const equipmentWithMarkup = equipmentTotal * (1 + equipMarkupPct / 100);

    /* --- Soft Costs --- */
    /* Data model: { id, item, qty, unit, rate, notes }
       unit = 'hrs'|'ls' → flat cost = qty × rate
       unit = '%'        → percent of base subtotal = rate% of base */
    const softCostFlat = softCosts.reduce((s, r) => r.unit !== '%' ? s + toNum(r.qty) * toNum(r.rate) : s, 0);
    const baseForPercent = totalMaterialCost + totalLabourCost + purchasedTotal + equipmentWithMarkup;
    const softCostPercent = softCosts.reduce((s, r) => r.unit === '%' ? s + (baseForPercent * toNum(r.rate)) / 100 : s, 0);
    const softCostTotal = softCostFlat + softCostPercent;

    /* --- Totals & Markup --- */
    const subtotal = totalMaterialCost + totalLabourCost + purchasedTotal + equipmentWithMarkup + softCostTotal;
    const markupPercent = toNum(rates.markup?.markupPercent);
    const markupAmount = subtotal * (markupPercent / 100);
    const bidPrice = subtotal + markupAmount;
    const hstPercent = toNum(rates.markup?.hstPercent) || 13;
    const hstAmount = bidPrice * (hstPercent / 100);
    const grandTotal = bidPrice + hstAmount;

    /* --- Metrics --- */
    const pricePerTon = totalWeightTons > 0 ? bidPrice / totalWeightTons : 0;
    const pricePerLb = totalWeightLbs > 0 ? bidPrice / totalWeightLbs : 0;
    const buildingArea = toNum(info.buildingAreaSqft);
    const pricePerSqft = buildingArea > 0 ? bidPrice / buildingArea : 0;

    return {
      structuralWt, miscWt, stairsWt, railingsWt, ladderWt, joistReinfWt,
      totalWeightLbs, totalWeightTons, stairsCalc,
      structFabHrs, structInstHrs, miscFabHrs, miscInstHrs,
      totalFabHrs, totalInstHrs,
      steelRate, miscRate, fabRate, installRate,
      structuralMaterialCost, miscMaterialCost, totalMaterialCost,
      fabLabourCost, installLabourCost, totalLabourCost,
      purchasedJoists, purchasedDeck, purchasedOther, purchasedTotal,
      equipmentTotal: equipmentWithMarkup,
      softCostFlat, softCostPercent, softCostTotal,
      subtotal, markupPercent, markupAmount, bidPrice,
      hstPercent, hstAmount, grandTotal,
      pricePerTon, pricePerLb, pricePerSqft,
    };
  }, [state, rates, info]);

  const risks = useMemo(() => {
    const flags = [];
    if ((state.structuralRows || []).length === 0) flags.push('No structural steel rows entered.');
    if (summary.pricePerTon > 0 && summary.pricePerTon < 3000) flags.push('$/ton is below typical range — review rates or takeoff.');
    if (summary.pricePerTon > 18000) flags.push('$/ton is above typical range — verify scope.');
    if (toNum(info.distanceKm) > 200) flags.push('Site distance is ' + info.distanceKm + ' km — verify travel/transport costs.');
    if (summary.totalFabHrs === 0 && summary.totalInstHrs === 0) flags.push('Zero hours recorded — labour estimates may be missing.');
    if (summary.totalMaterialCost === 0) flags.push('Material cost is $0 — check material rates.');
    return flags;
  }, [summary, state, info]);

  const SectionCard = ({ children, className = '' }) => (
    <div className={`rounded-xl border border-silver-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
  );

  const SummaryRow = ({ label, value, bold, indent, border }) => (
    <div className={`flex items-center justify-between py-2 px-3 ${border ? 'border-t border-silver-200' : ''} ${bold ? 'font-semibold text-steel-900' : 'text-steel-700'} ${indent ? 'pl-8' : ''}`}>
      <span>{label}</span>
      <span className={bold ? 'text-fire-600' : ''}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="accent-stripe h-1.5 rounded-full bg-gradient-to-r from-fire-500 via-fire-400 to-amber-400" />

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fire-500/10">
          <FileSpreadsheet className="h-6 w-6 text-fire-600" />
        </div>
        <div>
          <h1 className="page-title text-2xl font-bold text-steel-900">Project Summary</h1>
          <p className="page-subtitle text-sm text-steel-500">Complete cost rollup &mdash; material, labour, equipment, soft costs, markup</p>
        </div>
      </div>

      {/* Project Info Banner */}
      <SectionCard>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            ['Project', info.projectName],
            ['Quote #', info.quoteNumber],
            ['Date', info.quoteDate],
            ['Location', info.location],
            ['GC / Client', info.gcClient],
            ['Distance', info.distanceKm ? fmtNum(info.distanceKm) + ' km' : null],
            ['Building Area', info.buildingAreaSqft ? fmtNum(info.buildingAreaSqft) + ' sq ft' : null],
            ['Engineer', info.engineer],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-400">{lbl}</p>
              <p className="text-sm font-semibold text-steel-900">{val || '—'}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Weight Summary */}
      <SectionCard>
        <div className="mb-4 flex items-center gap-2">
          <Weight className="h-5 w-5 text-fire-600" />
          <h2 className="text-lg font-semibold text-steel-900">Weight Summary</h2>
        </div>
        <div className="divide-y divide-silver-100 rounded-lg border border-silver-100 bg-silver-50/50">
          {[
            ['Structural Steel', summary.structuralWt],
            ['Misc Metals', summary.miscWt],
            ['Stairs', summary.stairsWt],
            ['Railings', summary.railingsWt],
            ['Ladders', summary.ladderWt],
            ['Joist Reinforcing', summary.joistReinfWt],
          ].map(([label, wt]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-steel-600">{label}</span>
              <span className="font-medium text-steel-800">{fmtNum(wt)} lbs</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-steel-800 px-4 py-3 text-sm font-semibold text-white first:rounded-t-lg last:rounded-b-lg">
            <span>Total Weight</span>
            <span>{fmtNum(summary.totalWeightLbs)} lbs ({fmtNum(summary.totalWeightTons, 2)} tons)</span>
          </div>
        </div>
      </SectionCard>

      {/* Hours Summary */}
      <SectionCard>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-fire-600" />
          <h2 className="text-lg font-semibold text-steel-900">Hours Summary</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">{fmtNum(summary.totalFabHrs, 1)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Fabrication Hours</p>
          </div>
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">{fmtNum(summary.totalInstHrs, 1)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Installation Hours</p>
          </div>
          <div className="rounded-lg border border-fire-200 bg-fire-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-fire-600">{fmtNum(summary.totalFabHrs + summary.totalInstHrs, 1)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-fire-500">Total Hours</p>
          </div>
        </div>
      </SectionCard>

      {/* Cost Breakdown */}
      <SectionCard>
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-fire-600" />
          <h2 className="text-lg font-semibold text-steel-900">Cost Breakdown</h2>
        </div>
        <div className="divide-y divide-silver-100 rounded-lg border border-silver-100">
          <SummaryRow label="A. Material" value={summary.totalMaterialCost} bold />
          <SummaryRow label={'Structural Material (@' + fmt(summary.steelRate) + '/lb)'} value={summary.structuralMaterialCost} indent />
          <SummaryRow label={'Misc / Other Material (@' + fmt(summary.miscRate) + '/lb)'} value={summary.miscMaterialCost} indent />

          <SummaryRow label={'B. Fabrication Labour (' + fmtNum(summary.totalFabHrs, 1) + ' hrs @ ' + fmt(summary.fabRate) + '/hr)'} value={summary.fabLabourCost} bold border />
          <SummaryRow label={'C. Installation Labour (' + fmtNum(summary.totalInstHrs, 1) + ' hrs @ ' + fmt(summary.installRate) + '/hr)'} value={summary.installLabourCost} bold border />

          <SummaryRow label="D. Purchased Items" value={summary.purchasedTotal} bold border />
          {summary.purchasedJoists > 0 && <SummaryRow label="Joists" value={summary.purchasedJoists} indent />}
          {summary.purchasedDeck > 0 && <SummaryRow label="Steel Deck" value={summary.purchasedDeck} indent />}
          {summary.purchasedOther > 0 && <SummaryRow label="Other" value={summary.purchasedOther} indent />}

          <SummaryRow label="E. Equipment" value={summary.equipmentTotal} bold border />

          <SummaryRow label="F. Soft Costs" value={summary.softCostTotal} bold border />
          <SummaryRow label="Flat Costs" value={summary.softCostFlat} indent />
          <SummaryRow label="Percentage-based Costs" value={summary.softCostPercent} indent />

          <div className="flex items-center justify-between border-t-2 border-steel-300 bg-silver-50 px-3 py-3">
            <span className="font-bold text-steel-900">G. Subtotal</span>
            <span className="font-bold text-steel-900">{fmt(summary.subtotal)}</span>
          </div>

          <SummaryRow label={'H. Markup (' + fmtNum(summary.markupPercent, 1) + '%)'} value={summary.markupAmount} bold />

          <div className="flex items-center justify-between border-t-2 border-fire-300 bg-fire-50 px-3 py-3">
            <span className="text-lg font-bold text-fire-700">I. Bid Price</span>
            <span className="text-lg font-bold text-fire-700">{fmt(summary.bidPrice)}</span>
          </div>

          <SummaryRow label={'J. HST (' + fmtNum(summary.hstPercent, 1) + '%)'} value={summary.hstAmount} />

          <div className="flex items-center justify-between rounded-b-lg bg-steel-800 px-3 py-4">
            <span className="text-lg font-bold text-white">K. Grand Total</span>
            <span className="text-lg font-bold text-fire-400">{fmt(summary.grandTotal)}</span>
          </div>
        </div>
      </SectionCard>

      {/* Key Metrics */}
      <SectionCard>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-fire-600" />
          <h2 className="text-lg font-semibold text-steel-900">Key Metrics</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            [summary.pricePerTon, '$ / Ton'],
            [summary.pricePerLb, '$ / lb'],
            [summary.pricePerSqft, '$ / sq ft'],
          ].map(([val, lbl]) => (
            <div key={lbl} className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
              <p className="text-2xl font-bold text-steel-900">{val > 0 ? fmt(val) : '—'}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-400">{lbl}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Benchmark Comparison */}
      {summary.pricePerTon > 0 && (
        <SectionCard>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fire-600" />
            <h2 className="text-lg font-semibold text-steel-900">Benchmark Comparison</h2>
          </div>
          <p className="mb-4 text-sm text-steel-500">
            Your bid price per ton: <span className="font-semibold text-fire-600">{fmt(summary.pricePerTon)}</span>
          </p>
          <div className="space-y-3">
            {benchmarks.map((b) => {
              const scaleMin = 2000, scaleMax = 20000, totalScale = scaleMax - scaleMin;
              const leftPct = ((b.low - scaleMin) / totalScale) * 100;
              const widthPct = ((b.high - b.low) / totalScale) * 100;
              const markerPct = ((summary.pricePerTon - scaleMin) / totalScale) * 100;
              const inRange = summary.pricePerTon >= b.low && summary.pricePerTon <= b.high;
              return (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-medium ${inRange ? 'text-fire-600' : 'text-steel-500'}`}>{b.label}</span>
                    <span className="text-steel-400">{fmt(b.low)} — {fmt(b.high)}</span>
                  </div>
                  <div className="relative h-4 w-full rounded-full bg-silver-100">
                    <div className={`absolute top-0 h-full rounded-full ${b.color} opacity-30`} style={{ left: leftPct + '%', width: widthPct + '%' }} />
                    {inRange && <div className="absolute top-0 h-full w-1 rounded-full bg-fire-600" style={{ left: Math.min(Math.max(markerPct, 0), 100) + '%' }} title={fmt(summary.pricePerTon)} />}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-steel-400">Vertical bar shows where this project falls within each range.</p>
        </SectionCard>
      )}

      {/* Risk Flags */}
      {risks.length > 0 && (
        <SectionCard className="border-amber-200 bg-amber-50/30">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-steel-900">Risk Flags</h2>
          </div>
          <ul className="space-y-2">
            {risks.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-steel-700">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {flag}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="border-t border-silver-200 pt-4 text-center text-xs text-steel-400">
        Triple Weld Inc. &mdash; Project Summary &mdash; Generated {new Date().toLocaleDateString('en-CA')}
      </div>
    </div>
  );
}
