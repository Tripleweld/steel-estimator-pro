import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { calcStairs } from '../utils/calculations';
import { calcEquipRentalCost } from '../context/ProjectContext';
import {
  FileSpreadsheet,
  TrendingUp,
  Weight,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

const fmt = (v) =>
  '$' +
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtNum = (v, d = 0) =>
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

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
    const structural = state.structural || [];
    const miscMetals = state.miscMetals || [];
    const railings = state.railings || [];
    const ladder = state.ladder || [];
    const joistReinf = state.joistReinf || [];
    const purchased = state.purchased || [];
    const softCosts = state.softCosts || [];
    const equipment = rates.equipment || [];
    const stairs = state.stairs || {};

    // --- Weights ---
    const structuralWt = structural.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.lengthFt) || 0) * (Number(r.lbsPerFt) || 0),
      0
    );
    const miscWt = miscMetals.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.lengthFt) || 0) * (Number(r.lbsPerFt) || 0),
      0
    );

    const stairsCalc = calcStairs ? calcStairs(stairs) : { totalWeight: 0, flights: 0 };
    const stairsWt = Number(stairsCalc.totalWeight) || 0;

    const railingsWt = railings.reduce((sum, r) => sum + (Number(r.weightLbs) || 0), 0);
    const ladderWt = ladder.reduce((sum, r) => sum + (Number(r.weightLbs) || 0), 0);
    const joistReinfWt = joistReinf.reduce(
      (sum, r) => sum + (Number(r.weightLbs) || 0) * (Number(r.qty) || 1),
      0
    );

    const totalWeightLbs = structuralWt + miscWt + stairsWt + railingsWt + ladderWt + joistReinfWt;
    const totalWeightTons = totalWeightLbs / 2000;

    // --- Hours ---
    const structFabHrs = structural.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.fabHrsPerPc) || 0),
      0
    );
    const structInstHrs = structural.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.installHrsPerPc) || 0),
      0
    );
    const miscFabHrs = miscMetals.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.fabHrsPerPc) || 0),
      0
    );
    const miscInstHrs = miscMetals.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.installHrsPerPc) || 0),
      0
    );
    const railFabHrs = railings.reduce((sum, r) => sum + (Number(r.fabHrs) || 0), 0);
    const railInstHrs = railings.reduce((sum, r) => sum + (Number(r.installHrs) || 0), 0);
    const ladderFabHrs = ladder.reduce((sum, r) => sum + (Number(r.fabHrs) || 0), 0);
    const ladderInstHrs = ladder.reduce((sum, r) => sum + (Number(r.installHrs) || 0), 0);
    const joistFabHrs = joistReinf.reduce((sum, r) => sum + (Number(r.fabHrs) || 0), 0);
    const joistInstHrs = joistReinf.reduce((sum, r) => sum + (Number(r.installHrs) || 0), 0);
    const stairsFabHrs = Number(stairsCalc.fabHrs) || 0;
    const stairsInstHrs = Number(stairsCalc.installHrs) || 0;

    const totalFabHrs =
      structFabHrs + miscFabHrs + railFabHrs + ladderFabHrs + joistFabHrs + stairsFabHrs;
    const totalInstHrs =
      structInstHrs + miscInstHrs + railInstHrs + ladderInstHrs + joistInstHrs + stairsInstHrs;

    // --- Costs ---
    const matRates = rates.material || {};
    const wastePercent = Number(matRates.wastePercent) || 0;
    const connectionPercent = Number(matRates.connectionPercent) || 0;
    const steelRate = Number(matRates.steelRate) || 0;
    const miscRate = Number(matRates.miscRate) || steelRate;

    const structuralMaterialCost =
      structuralWt * steelRate * (1 + wastePercent / 100 + connectionPercent / 100);
    const miscMaterialCost =
      (miscWt + stairsWt + railingsWt + ladderWt + joistReinfWt) *
      (miscRate || steelRate) *
      (1 + wastePercent / 100);
    const totalMaterialCost = structuralMaterialCost + miscMaterialCost;

    const labourRates = rates.labour || {};
    const fabRate = Number(labourRates.fabRate) || 0;
    const installRate = Number(labourRates.installRate) || 0;
    const fabLabourCost = totalFabHrs * fabRate;
    const installLabourCost = totalInstHrs * installRate;
    const totalLabourCost = fabLabourCost + installLabourCost;

    const purchasedTotal = purchased.reduce(
      (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.unitCost) || 0),
      0
    );

    // Equipment
    let equipmentTotal = 0;
    equipment.forEach((eq) => {
      if (calcEquipRentalCost) {
        equipmentTotal += Number(calcEquipRentalCost(eq)) || 0;
      } else {
        const rental = (Number(eq.rate) || 0) * (Number(eq.days) || 0);
        const pickup = Number(eq.pickup) || 0;
        const dropoff = Number(eq.dropoff) || 0;
        equipmentTotal += rental + pickup + dropoff;
      }
    });
    const equipMarkupPct = Number(rates.markup?.equipmentMarkup) || 0;
    const equipmentWithMarkup = equipmentTotal * (1 + equipMarkupPct / 100);

    // Soft Costs
    const softCostFlat = softCosts.reduce(
      (sum, r) => (r.type === 'flat' ? sum + (Number(r.amount) || 0) : sum),
      0
    );
    const baseForPercent = totalMaterialCost + totalLabourCost + purchasedTotal + equipmentWithMarkup;
    const softCostPercent = softCosts.reduce(
      (sum, r) =>
        r.type === 'percent' ? sum + (baseForPercent * (Number(r.percent) || 0)) / 100 : sum,
      0
    );
    const softCostTotal = softCostFlat + softCostPercent;

    // Totals
    const subtotal =
      totalMaterialCost +
      totalLabourCost +
      purchasedTotal +
      equipmentWithMarkup +
      softCostTotal;

    const markupPercent = Number(rates.markup?.markupPercent) || 0;
    const markupAmount = subtotal * (markupPercent / 100);
    const bidPrice = subtotal + markupAmount;
    const hstPercent = Number(rates.markup?.hstPercent) || 13;
    const hstAmount = bidPrice * (hstPercent / 100);
    const grandTotal = bidPrice + hstAmount;

    // Metrics
    const pricePerTon = totalWeightTons > 0 ? bidPrice / totalWeightTons : 0;
    const pricePerLb = totalWeightLbs > 0 ? bidPrice / totalWeightLbs : 0;
    const buildingArea = Number(info.buildingAreaSqft) || 0;
    const pricePerSqft = buildingArea > 0 ? bidPrice / buildingArea : 0;

    return {
      structuralWt,
      miscWt,
      stairsWt,
      railingsWt,
      ladderWt,
      joistReinfWt,
      totalWeightLbs,
      totalWeightTons,
      stairsCalc,
      totalFabHrs,
      totalInstHrs,
      structuralMaterialCost,
      miscMaterialCost,
      totalMaterialCost,
      fabLabourCost,
      installLabourCost,
      totalLabourCost,
      purchasedTotal,
      equipmentTotal: equipmentWithMarkup,
      softCostFlat,
      softCostPercent,
      softCostTotal,
      subtotal,
      markupPercent,
      markupAmount,
      bidPrice,
      hstPercent,
      hstAmount,
      grandTotal,
      pricePerTon,
      pricePerLb,
      pricePerSqft,
    };
  }, [state, rates, info]);

  const risks = useMemo(() => {
    const flags = [];
    if ((state.structural || []).length === 0)
      flags.push('No structural steel rows entered.');
    if (summary.pricePerTon > 0 && summary.pricePerTon < 3000)
      flags.push('$/ton is below typical range — review rates or takeoff.');
    if (summary.pricePerTon > 18000)
      flags.push('$/ton is above typical range — verify scope.');
    if ((Number(info.distanceKm) || 0) > 200)
      flags.push(`Site distance is ${info.distanceKm} km — verify travel/transport costs.`);
    if (summary.totalFabHrs === 0 && summary.totalInstHrs === 0)
      flags.push('Zero hours recorded — labour estimates may be missing.');
    if (summary.totalMaterialCost === 0)
      flags.push('Material cost is $0 — check material rates.');
    return flags;
  }, [summary, state, info]);

  const SectionCard = ({ children, className = '' }) => (
    <div className={`rounded-xl border border-silver-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );

  const SummaryRow = ({ label, value, bold, indent, border }) => (
    <div
      className={`flex items-center justify-between py-2 px-3 ${
        border ? 'border-t border-silver-200' : ''
      } ${bold ? 'font-semibold text-steel-900' : 'text-steel-700'} ${
        indent ? 'pl-8' : ''
      }`}
    >
      <span>{label}</span>
      <span className={bold ? 'text-fire-600' : ''}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Accent stripe */}
      <div className="accent-stripe h-1.5 rounded-full bg-gradient-to-r from-fire-500 via-fire-400 to-amber-400" />

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fire-500/10">
          <FileSpreadsheet className="h-6 w-6 text-fire-600" />
        </div>
        <div>
          <h1 className="page-title text-2xl font-bold text-steel-900">Project Summary</h1>
          <p className="page-subtitle text-sm text-steel-500">
            Complete cost rollup — material, labour, equipment, soft costs, markup
          </p>
        </div>
      </div>

      {/* Project Info Banner */}
      <SectionCard>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Project</p>
            <p className="text-sm font-semibold text-steel-900">{info.projectName || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Quote #</p>
            <p className="text-sm font-semibold text-steel-900">{info.quoteNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Date</p>
            <p className="text-sm font-semibold text-steel-900">{info.quoteDate || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Location</p>
            <p className="text-sm font-semibold text-steel-900">{info.location || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">GC / Client</p>
            <p className="text-sm font-semibold text-steel-900">{info.gcClient || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Distance</p>
            <p className="text-sm font-semibold text-steel-900">
              {info.distanceKm ? `${fmtNum(info.distanceKm)} km` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              Building Area
            </p>
            <p className="text-sm font-semibold text-steel-900">
              {info.buildingAreaSqft ? `${fmtNum(info.buildingAreaSqft)} sq ft` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Engineer</p>
            <p className="text-sm font-semibold text-steel-900">{info.engineer || '—'}</p>
          </div>
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
            <span>
              {fmtNum(summary.totalWeightLbs)} lbs ({fmtNum(summary.totalWeightTons, 2)} tons)
            </span>
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
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              Fabrication Hours
            </p>
          </div>
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">{fmtNum(summary.totalInstHrs, 1)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              Installation Hours
            </p>
          </div>
          <div className="rounded-lg border border-fire-200 bg-fire-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-fire-600">
              {fmtNum(summary.totalFabHrs + summary.totalInstHrs, 1)}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-fire-500">
              Total Hours
            </p>
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
          {/* A. Material */}
          <SummaryRow label="A. Material" value={summary.totalMaterialCost} bold />
          <SummaryRow label="Structural Material" value={summary.structuralMaterialCost} indent />
          <SummaryRow label="Misc / Other Material" value={summary.miscMaterialCost} indent />

          {/* B. Fabrication Labour */}
          <SummaryRow label="B. Fabrication Labour" value={summary.fabLabourCost} bold border />

          {/* C. Installation Labour */}
          <SummaryRow label="C. Installation Labour" value={summary.installLabourCost} bold border />

          {/* D. Purchased Items */}
          <SummaryRow label="D. Purchased Items" value={summary.purchasedTotal} bold border />

          {/* E. Equipment */}
          <SummaryRow label="E. Equipment" value={summary.equipmentTotal} bold border />

          {/* F. Soft Costs */}
          <SummaryRow label="F. Soft Costs" value={summary.softCostTotal} bold border />
          <SummaryRow label="Flat Costs" value={summary.softCostFlat} indent />
          <SummaryRow label="Percentage-based Costs" value={summary.softCostPercent} indent />

          {/* G. Subtotal */}
          <div className="flex items-center justify-between border-t-2 border-steel-300 bg-silver-50 px-3 py-3">
            <span className="font-bold text-steel-900">G. Subtotal</span>
            <span className="font-bold text-steel-900">{fmt(summary.subtotal)}</span>
          </div>

          {/* H. Markup */}
          <SummaryRow
            label={`H. Markup (${fmtNum(summary.markupPercent, 1)}%)`}
            value={summary.markupAmount}
            bold
          />

          {/* I. Bid Price */}
          <div className="flex items-center justify-between border-t-2 border-fire-300 bg-fire-50 px-3 py-3">
            <span className="text-lg font-bold text-fire-700">I. Bid Price</span>
            <span className="text-lg font-bold text-fire-700">{fmt(summary.bidPrice)}</span>
          </div>

          {/* J. HST */}
          <SummaryRow
            label={`J. HST (${fmtNum(summary.hstPercent, 1)}%)`}
            value={summary.hstAmount}
          />

          {/* K. Grand Total */}
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
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">
              {summary.pricePerTon > 0 ? fmt(summary.pricePerTon) : '—'}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              $ / Ton
            </p>
          </div>
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">
              {summary.pricePerLb > 0 ? fmt(summary.pricePerLb) : '—'}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              $ / lb
            </p>
          </div>
          <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4 text-center">
            <p className="text-2xl font-bold text-steel-900">
              {summary.pricePerSqft > 0 ? fmt(summary.pricePerSqft) : '—'}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
              $ / sq ft
            </p>
          </div>
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
            Your bid price per ton:{' '}
            <span className="font-semibold text-fire-600">{fmt(summary.pricePerTon)}</span>
          </p>
          <div className="space-y-3">
            {benchmarks.map((b) => {
              const rangeWidth = b.high - b.low;
              const scaleMin = 2000;
              const scaleMax = 20000;
              const totalScale = scaleMax - scaleMin;
              const leftPct = ((b.low - scaleMin) / totalScale) * 100;
              const widthPct = (rangeWidth / totalScale) * 100;
              const markerPct = ((summary.pricePerTon - scaleMin) / totalScale) * 100;
              const inRange =
                summary.pricePerTon >= b.low && summary.pricePerTon <= b.high;

              return (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-medium ${inRange ? 'text-fire-600' : 'text-steel-500'}`}>
                      {b.label}
                    </span>
                    <span className="text-steel-400">
                      {fmt(b.low)} — {fmt(b.high)}
                    </span>
                  </div>
                  <div className="relative h-4 w-full rounded-full bg-silver-100">
                    <div
                      className={`absolute top-0 h-full rounded-full ${b.color} opacity-30`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                    {inRange && (
                      <div
                        className="absolute top-0 h-full w-1 rounded-full bg-fire-600"
                        style={{ left: `${Math.min(Math.max(markerPct, 0), 100)}%` }}
                        title={fmt(summary.pricePerTon)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-steel-400">
            Vertical bar shows where this project falls within each range.
          </p>
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

      {/* Footer */}
      <div className="border-t border-silver-200 pt-4 text-center text-xs text-steel-400">
        Triple Weld Inc. &mdash; Project Summary &mdash; Generated{' '}
        {new Date().toLocaleDateString('en-CA')}
      </div>
    </div>
  );
}
