import React, { useMemo, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { calcStairs } from '../utils/calculations';
import { calcEquipRentalCost } from '../context/ProjectContext';
import { FileText, Printer, Download } from 'lucide-react';

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

export default function Quote() {
  const { state } = useProject();
  const info = state.projectInfo || {};
  const rates = state.rates || {};
  const quoteRef = useRef(null);

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

    // Weights
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

    // Hours
    const totalFabHrs =
      structural.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.fabHrsPerPc) || 0), 0) +
      miscMetals.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.fabHrsPerPc) || 0), 0) +
      railings.reduce((s, r) => s + (Number(r.fabHrs) || 0), 0) +
      ladder.reduce((s, r) => s + (Number(r.fabHrs) || 0), 0) +
      joistReinf.reduce((s, r) => s + (Number(r.fabHrs) || 0), 0) +
      (Number(stairsCalc.fabHrs) || 0);

    const totalInstHrs =
      structural.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.installHrsPerPc) || 0), 0) +
      miscMetals.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.installHrsPerPc) || 0), 0) +
      railings.reduce((s, r) => s + (Number(r.installHrs) || 0), 0) +
      ladder.reduce((s, r) => s + (Number(r.installHrs) || 0), 0) +
      joistReinf.reduce((s, r) => s + (Number(r.installHrs) || 0), 0) +
      (Number(stairsCalc.installHrs) || 0);

    // Costs
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
    const totalLabourCost = totalFabHrs * fabRate + totalInstHrs * installRate;

    const purchasedTotal = purchased.reduce(
      (s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0),
      0
    );

    let equipmentTotal = 0;
    equipment.forEach((eq) => {
      if (calcEquipRentalCost) {
        equipmentTotal += Number(calcEquipRentalCost(eq)) || 0;
      } else {
        equipmentTotal +=
          (Number(eq.rate) || 0) * (Number(eq.days) || 0) +
          (Number(eq.pickup) || 0) +
          (Number(eq.dropoff) || 0);
      }
    });
    const equipMarkupPct = Number(rates.markup?.equipmentMarkup) || 0;
    const equipmentWithMarkup = equipmentTotal * (1 + equipMarkupPct / 100);

    const baseForPercent = totalMaterialCost + totalLabourCost + purchasedTotal + equipmentWithMarkup;
    const softCostTotal = softCosts.reduce((s, r) => {
      if (r.type === 'flat') return s + (Number(r.amount) || 0);
      if (r.type === 'percent') return s + (baseForPercent * (Number(r.percent) || 0)) / 100;
      return s;
    }, 0);

    const subtotal =
      totalMaterialCost + totalLabourCost + purchasedTotal + equipmentWithMarkup + softCostTotal;
    const markupPercent = Number(rates.markup?.markupPercent) || 0;
    const markupAmount = subtotal * (markupPercent / 100);
    const bidPrice = subtotal + markupAmount;
    const hstPercent = Number(rates.markup?.hstPercent) || 13;
    const hstAmount = bidPrice * (hstPercent / 100);
    const grandTotal = bidPrice + hstAmount;

    // Scope helpers
    const hasStructural = structural.length > 0;
    const hasMisc = miscMetals.length > 0;
    const hasStairs = (Number(stairsCalc.flights) || 0) > 0;
    const totalRailingFt = railings.reduce((s, r) => s + (Number(r.lengthFt) || 0), 0);
    const hasRailings = railings.length > 0 && totalRailingFt > 0;
    const hasLadder = ladder.length > 0;
    const hasJoistReinf = joistReinf.length > 0;
    const hasPurchased = purchased.length > 0;

    return {
      totalWeightTons,
      totalMaterialCost,
      totalLabourCost,
      purchasedTotal,
      equipmentTotal: equipmentWithMarkup,
      softCostTotal,
      subtotal,
      markupPercent,
      markupAmount,
      bidPrice,
      hstPercent,
      hstAmount,
      grandTotal,
      hasStructural,
      hasMisc,
      hasStairs,
      stairsFlights: Number(stairsCalc.flights) || 0,
      totalRailingFt,
      hasRailings,
      hasLadder,
      hasJoistReinf,
      hasPurchased,
    };
  }, [state, rates]);

  const handlePrint = () => window.print();

  const quoteDate = info.quoteDate || new Date().toLocaleDateString('en-CA');

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-document, #quote-document * { visibility: visible; }
          #quote-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            font-size: 12px;
          }
          .no-print { display: none !important; }
          @page {
            size: letter;
            margin: 0.75in;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Accent stripe */}
        <div className="accent-stripe h-1.5 rounded-full bg-gradient-to-r from-fire-500 via-fire-400 to-amber-400 no-print" />

        {/* Toolbar */}
        <div className="no-print flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fire-500/10">
              <FileText className="h-6 w-6 text-fire-600" />
            </div>
            <div>
              <h1 className="page-title text-2xl font-bold text-steel-900">Quote / Proposal</h1>
              <p className="page-subtitle text-sm text-steel-500">
                Print-ready quote document for your client
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-silver-200 bg-white px-4 py-2 text-sm font-semibold text-steel-700 shadow-sm transition hover:bg-silver-50"
              title="PDF generation coming soon"
            >
              <Download className="h-4 w-4" />
              Generate PDF
            </button>
          </div>
        </div>

        {/* Quote Document */}
        <div
          id="quote-document"
          ref={quoteRef}
          className="rounded-xl border border-silver-200 bg-white p-8 shadow-sm sm:p-12"
        >
          {/* Letterhead */}
          <div className="mb-8 border-b-2 border-fire-500 pb-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-steel-900">
              TRIPLE WELD INC.
            </h2>
            <p className="mt-1 text-sm font-semibold text-fire-600">
              CWB Certified Steel Fabrication &amp; Erection
            </p>
            <p className="mt-2 text-xs text-steel-400">
              123 Industrial Rd, Unit 4 &bull; Anytown, ON &bull; (555) 123-4567 &bull;
              info@tripleweld.com
            </p>
          </div>

          {/* Quote Details */}
          <div className="mb-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
                Quote Number
              </p>
              <p className="text-sm font-bold text-steel-900">{info.quoteNumber || 'TBD'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-400">Date</p>
              <p className="text-sm font-bold text-steel-900">{quoteDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
                Valid For
              </p>
              <p className="text-sm font-bold text-steel-900">30 days</p>
            </div>
          </div>

          {/* Project & Client */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-400">
                Project
              </p>
              <p className="text-sm font-bold text-steel-900">{info.projectName || '—'}</p>
              <p className="text-sm text-steel-600">{info.location || '—'}</p>
            </div>
            <div className="rounded-lg border border-silver-100 bg-silver-50/50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-400">
                Client / General Contractor
              </p>
              <p className="text-sm font-bold text-steel-900">{info.gcClient || '—'}</p>
              {info.engineer && (
                <p className="text-sm text-steel-600">Engineer: {info.engineer}</p>
              )}
              {info.drawingSet && (
                <p className="text-sm text-steel-600">Drawing Set: {info.drawingSet}</p>
              )}
            </div>
          </div>

          {/* Scope of Work */}
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-steel-900">
              Scope of Work
            </h3>
            <p className="mb-3 text-sm text-steel-600">
              Triple Weld Inc. is pleased to provide the following quotation for structural steel
              fabrication and erection services:
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-steel-700">
              {summary.hasStructural && (
                <li>
                  Supply and install approx. {fmtNum(summary.totalWeightTons, 1)} tons of
                  structural steel
                </li>
              )}
              {summary.hasMisc && (
                <li>Fabricate and install miscellaneous metals</li>
              )}
              {summary.hasStairs && (
                <li>
                  Fabricate and install {summary.stairsFlights} stair flight
                  {summary.stairsFlights !== 1 ? 's' : ''} with associated landings
                </li>
              )}
              {summary.hasRailings && (
                <li>
                  Supply and install {fmtNum(summary.totalRailingFt)} lin.ft of railings
                </li>
              )}
              {summary.hasLadder && <li>Supply and install fixed ladders</li>}
              {summary.hasJoistReinf && (
                <li>Provide and install joist reinforcing</li>
              )}
              {summary.hasPurchased && (
                <li>Supply purchased / third-party items as specified</li>
              )}
              <li>All shop drawings and engineering as required</li>
              <li>Delivery to site and unloading</li>
              <li>
                Touch-up painting of field connections (shop primer on all fabricated steel)
              </li>
            </ul>
          </div>

          {/* Pricing Table */}
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-steel-900">
              Pricing
            </h3>
            <div className="overflow-hidden rounded-lg border border-silver-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-800 text-left text-white">
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  <tr>
                    <td className="px-4 py-2.5 text-steel-700">Material</td>
                    <td className="px-4 py-2.5 text-right text-steel-800">
                      {fmt(summary.totalMaterialCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-steel-700">Labour</td>
                    <td className="px-4 py-2.5 text-right text-steel-800">
                      {fmt(summary.totalLabourCost)}
                    </td>
                  </tr>
                  {summary.equipmentTotal > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 text-steel-700">Equipment</td>
                      <td className="px-4 py-2.5 text-right text-steel-800">
                        {fmt(summary.equipmentTotal)}
                      </td>
                    </tr>
                  )}
                  {summary.softCostTotal > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 text-steel-700">Other Costs</td>
                      <td className="px-4 py-2.5 text-right text-steel-800">
                        {fmt(summary.softCostTotal)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-silver-50">
                    <td className="px-4 py-2.5 font-semibold text-steel-900">Subtotal</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-steel-900">
                      {fmt(summary.subtotal)}
                    </td>
                  </tr>
                  {summary.markupAmount > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 text-steel-700">
                        Markup ({fmtNum(summary.markupPercent, 1)}%)
                      </td>
                      <td className="px-4 py-2.5 text-right text-steel-800">
                        {fmt(summary.markupAmount)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-fire-50">
                    <td className="px-4 py-3 text-base font-bold text-fire-700">Bid Price</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-fire-700">
                      {fmt(summary.bidPrice)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-steel-700">
                      HST ({fmtNum(summary.hstPercent, 1)}%)
                    </td>
                    <td className="px-4 py-2.5 text-right text-steel-800">
                      {fmt(summary.hstAmount)}
                    </td>
                  </tr>
                  <tr className="bg-steel-800">
                    <td className="px-4 py-3 text-base font-bold text-white">Grand Total</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-fire-400">
                      {fmt(summary.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Exclusions */}
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-steel-900">
              Exclusions
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-steel-600">
              <li>Fireproofing of structural steel</li>
              <li>Concrete, masonry, and foundations</li>
              <li>Painting beyond standard shop primer</li>
              <li>Hoisting or placing materials for other trades</li>
              <li>Permit fees and inspection costs</li>
              <li>Demolition or removal of existing steel</li>
              <li>Engineering stamps (unless specified in scope)</li>
              <li>Night or overtime work (unless priced separately)</li>
            </ul>
          </div>

          {/* Terms & Conditions */}
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-steel-900">
              Terms &amp; Conditions
            </h3>
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-steel-600">
              <li>
                This quotation is valid for <strong>30 days</strong> from the date above.
              </li>
              <li>
                Payment terms: 10% deposit upon acceptance, progress billing monthly, net 30 days.
              </li>
              <li>
                Mobilization within 4-6 weeks of shop drawing approval, subject to current
                production schedule.
              </li>
              <li>
                Any changes to the scope of work will be subject to a written change order and
                adjusted pricing.
              </li>
              <li>
                Triple Weld Inc. carries comprehensive general liability and CWB certification
                for all welding operations.
              </li>
              <li>
                Owner/GC to provide clear, level access to the erection area and timely
                approval of shop drawings.
              </li>
            </ol>
          </div>

          {/* Signature Block */}
          <div className="mt-12 grid grid-cols-1 gap-8 border-t border-silver-200 pt-8 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-400">
                For Triple Weld Inc.
              </p>
              <div className="mt-10 border-t border-steel-300 pt-2">
                <p className="text-sm text-steel-700">Authorized Signature</p>
                <p className="text-xs text-steel-400">Name / Title / Date</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-400">
                Accepted By (Client / GC)
              </p>
              <div className="mt-10 border-t border-steel-300 pt-2">
                <p className="text-sm text-steel-700">Authorized Signature</p>
                <p className="text-xs text-steel-400">Name / Title / Date</p>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-8 border-t border-silver-100 pt-4 text-center text-xs text-steel-400">
            TRIPLE WELD INC. &bull; CWB Certified &bull; Confidential
          </div>
        </div>

        {/* Page Footer (hidden in print) */}
        <div className="no-print border-t border-silver-200 pt-4 text-center text-xs text-steel-400">
          Triple Weld Inc. &mdash; Quote Document &mdash; Generated{' '}
          {new Date().toLocaleDateString('en-CA')}
        </div>
      </div>
    </>
  );
}
