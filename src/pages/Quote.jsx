import React, { useMemo, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { calcStairs } from '../utils/calculations';
import { calcEquipRentalCost } from '../context/ProjectContext';
import { FileText, Printer, Download, Pencil, Check, X, Plus, Trash2, RotateCcw } from 'lucide-react';

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
  const { state, dispatch } = useProject();
  const [editingSoW, setEditingSoW] = useState(false);
  const [editingExcl, setEditingExcl] = useState(false);
  const [editingTerms, setEditingTerms] = useState(false);
  const scopeOverrides = state.quoteScopeOverrides || {};
  const customScope = state.quoteScopeCustom || [];
  const exclOverrides = state.quoteExclOverrides || {};
  const customExcl = state.quoteExclCustom || [];
  const termsOverrides = state.quoteTermsOverrides || {};
  const customTerms = state.quoteTermsCustom || [];
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
      // (legacy flat handler removed)
      if (r.unit === '%') return s + (baseForPercent * (Number(r.rate) || 0)) / 100;
      return s + ((Number(r.qty) || 0) * (Number(r.rate) || 0));
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

  // Itemized pricing rows for Quote (non-zero only)
  const pricingItems = useMemo(() => {
    const rows = [];
    const stairs = state.stairs || [];
    const ladder = state.ladder || [];
    const railings = state.railings || [];
    const structuralRows = state.structuralRows || [];
    const standard = state.miscMetalsStandard || {};
    const lr = state.rates?.labourRates || {};
    const fabRate = lr.fabRate || 50;
    const installRate = lr.installRate || 55;
    const matRates = state.rates?.materialRates || [];
    const lookupMat = (item) => (matRates.find(m => m.item === item)?.rate) || 1;

    // STRUCTURAL TAKEOFF — group by section
    const SECT_LABELS = {
      columns: 'Columns', beams: 'Beams', momentConnections: 'Moment Connections',
      moment: 'Moment Connections', roofOpeningFrames: 'Roof Opening Frames',
      roofFrames: 'Roof Opening Frames', joists: 'Joists (OWSJ)',
      joistReinforcement: 'Joist Reinforcement', joistReinf: 'Joist Reinforcement',
      bridging: 'Bridging', steelDeck: 'Steel Deck'
    };
    const structGroups = {};
    structuralRows.forEach(r => {
      const key = r.section || 'other';
      const qty = Number(r.qty) || 0;
      const lengthFt = Number(r.lengthFt) || 0;
      const wtPerFt = Number(r.wtPerFt) || 0;
      const weight = qty * lengthFt * wtPerFt;
      const matRate = lookupMat('Structural steel');
      const material = weight * matRate;
      const fabMin = Number(r.fabPerPcOverride) || (Number(r.setup||0)+Number(r.cut||0)+Number(r.drill||0)+Number(r.feed||0)+Number(r.weld||0)+Number(r.grind||0)+Number(r.paint||0));
      const fabHrs = (qty * fabMin / 60) * (Number(r.fabCrew) || 1);
      const fabCost = fabHrs * fabRate;
      const instMin = Number(r.instPerPcOverride) || (Number(r.unload||0)+Number(r.rig||0)+Number(r.fit||0)+Number(r.bolt||0)+Number(r.touchUp||0));
      const instHrs = (qty * instMin / 60) * (Number(r.instCrew) || 1);
      const instCost = instHrs * installRate;
      // For joistReinf, use stored fields (computed by JR page)
      let total = material + fabCost + instCost;
      if (key === 'joistReinf' && (r.materialCost || r.installCost)) {
        total = (Number(r.materialCost) || 0) + (Number(r.installCost) || 0);
      }
      structGroups[key] = (structGroups[key] || 0) + total;
    });
    Object.entries(structGroups).forEach(([k, v]) => {
      if (v > 0) rows.push({ label: 'Structural Takeoff — ' + (SECT_LABELS[k] || k), total: v });
    });

    // MISC METALS — calculator items
    const stairsTot = stairs.reduce((s, x) => s + Number(x.totalsCommit?.total || 0), 0);
    if (stairsTot > 0) rows.push({ label: 'Misc Metals — Stairs', total: stairsTot });
    const ladderTot = ladder.reduce((s, x) => s + Number(x.totalsCommit?.total || 0), 0);
    if (ladderTot > 0) rows.push({ label: 'Misc Metals — Ladders', total: ladderTot });
    const railingsTot = railings.reduce((s, x) => s + Number(x.totalsCommit?.total || 0), 0);
    if (railingsTot > 0) rows.push({ label: 'Misc Metals — Railings', total: railingsTot });

    // MISC METALS — Standard items per section
    const MM_LABELS = {
      bollards: 'Bollards', cornerGuardsSS: 'Corner Guards (SS)', cornerGuardsMS: 'Corner Guards (MS)',
      embedPlates: 'Embed Plates', lintels: 'Lintels', edgeAngles: 'Edge Angles',
      bumperRails: 'Bumper Rails', wheelStops: 'Wheel Stops', floorPlates: 'Floor Plates',
      pipeSupports: 'Pipe Supports', anchorBolts: 'Anchor Bolts', equipDunnage: 'Equipment Dunnage',
      architectural: 'Architectural'
    };
    const miscRates = state.rates?.miscMetalsRates || [];
    const findMiscRate = (item) => (miscRates.find(r => r.item === item)?.rate) || 0;
    Object.entries(MM_LABELS).forEach(([key, label]) => {
      const items = standard[key] || [];
      const secTotal = items.reduce((s, row) => {
        const rate = (row.rateOverride != null && row.rateOverride !== '') ? Number(row.rateOverride) : findMiscRate(row.section || row.item || row.type);
        return s + (Number(row.qty) || 0) * rate;
      }, 0);
      if (secTotal > 0) rows.push({ label: 'Misc Metals — ' + label, total: secTotal });
    });

    // EQUIPMENT (use already-computed equipmentTotal from summary)
    if (summary.equipmentTotal > 0) rows.push({ label: 'Equipment', total: summary.equipmentTotal });

    // PURCHASED ITEMS — exclude joist/deck (already in Structural)
    const purchased = state.purchased || [];
    const purchExcl = purchased.filter(p => {
      const cat = String(p.category || p.item || '').toLowerCase();
      return !/(joist|deck)/.test(cat);
    });
    const purchTotal = purchExcl.reduce((s, p) => s + (Number(p.total) || (Number(p.qty || 0) * Number(p.unitCost || 0))), 0);
    if (purchTotal > 0) rows.push({ label: 'Purchased Items', total: purchTotal });

    // SOFT COSTS — single row, description = comma list of non-zero items
    const softCosts = state.softCosts || [];
    const softNonZero = softCosts.filter(c => {
      if (c.unit === '%') return Number(c.rate) > 0;
      return Number(c.qty || 0) * Number(c.rate || 0) > 0;
    });
    const softDesc = softNonZero.map(c => c.item).filter(Boolean).join(', ');
    if (summary.softCostTotal > 0) {
      rows.push({
        label: 'Soft Costs' + (softDesc ? ' (' + softDesc + ')' : ''),
        total: summary.softCostTotal
      });
    }

    return rows;
  }, [state, summary.equipmentTotal, summary.softCostTotal]);


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
            <div className="flex items-center gap-4">
              {info.companyLogo && (
                <div className="flex h-20 w-48 flex-shrink-0 items-center">
                  <img src={info.companyLogo} alt="Company Logo" className="max-h-20 max-w-full object-contain" />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-steel-900">
                  {info.companyName || 'TRIPLE WELD INC.'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-fire-600">
                  {info.companyTagline || 'CWB Certified Steel Fabrication & Erection'}
                </p>
                <p className="mt-2 text-xs text-steel-400">
                  {[info.companyAddress || '123 Industrial Rd, Unit 4, Anytown, ON',
                    info.companyPhone || '(555) 123-4567',
                    info.companyEmail || 'info@tripleweld.com'].join(' \u2022 ')}
                  {info.companyWebsite ? (' \u2022 ' + info.companyWebsite) : ''}
                </p>
              </div>
            </div>
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
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold uppercase tracking-wide text-steel-900">
                Scope of Work
              </h3>
              <button
                type="button"
                onClick={() => setEditingSoW(v => !v)}
                className="print:hidden inline-flex items-center gap-1 rounded border border-steel-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-600 hover:bg-steel-50 hover:text-steel-900 transition"
              >
                {editingSoW ? <Check size={12} /> : <Pencil size={12} />}
                {editingSoW ? 'Done' : 'Edit'}
              </button>
            </div>
            <p className="mb-3 text-sm text-steel-600">
              Triple Weld Inc. is pleased to provide the following quotation for structural steel
              fabrication and erection services:
            </p>
            {(() => {
              const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
              const defaultLines = [
                { key: 'structural', defaultVisible: !!summary.hasStructural, defaultText: `Supply and install approx. ${fmtNum(summary.totalWeightTons, 1)} tons of structural steel` },
                { key: 'misc', defaultVisible: !!summary.hasMisc, defaultText: 'Fabricate and install miscellaneous metals' },
                { key: 'stairs', defaultVisible: !!summary.hasStairs, defaultText: `Fabricate and install ${summary.stairsFlights || 0} stair flight${(summary.stairsFlights || 0) !== 1 ? 's' : ''} with associated landings` },
                { key: 'railings', defaultVisible: !!summary.hasRailings, defaultText: `Supply and install ${fmtNum(summary.totalRailingFt)} lin.ft of railings` },
                { key: 'ladder', defaultVisible: !!summary.hasLadder, defaultText: 'Supply and install fixed ladders' },
                { key: 'joistReinf', defaultVisible: !!summary.hasJoistReinf, defaultText: 'Provide and install joist reinforcing' },
                { key: 'purchased', defaultVisible: !!summary.hasPurchased, defaultText: 'Supply purchased / third-party items as specified' },
                { key: 'drawings', defaultVisible: true, defaultText: 'All shop drawings and engineering as required' },
                { key: 'delivery', defaultVisible: true, defaultText: 'Delivery to site and unloading' },
                { key: 'painting', defaultVisible: true, defaultText: 'Touch-up painting of field connections (shop primer on all fabricated steel)' },
              ];

              const visibleRender = defaultLines
                .map(line => {
                  const ov = scopeOverrides[line.key] || {};
                  const visible = ov.visible !== undefined ? ov.visible : line.defaultVisible;
                  const text = ov.text !== undefined ? ov.text : line.defaultText;
                  return { ...line, visible, text, isOverridden: ov.text !== undefined || ov.visible !== undefined };
                })
                .filter(l => l.visible);

              if (!editingSoW) {
                return (
                  <ul className="list-inside list-disc space-y-1.5 text-sm text-steel-700">
                    {visibleRender.map(line => (<li key={line.key}>{line.text}</li>))}
                    {customScope.map(cl => (<li key={cl.id}>{cl.text}</li>))}
                  </ul>
                );
              }

              return (
                <div className="space-y-2 print:hidden">
                  {defaultLines.map(line => {
                    const ov = scopeOverrides[line.key] || {};
                    const visible = ov.visible !== undefined ? ov.visible : line.defaultVisible;
                    const text = ov.text !== undefined ? ov.text : line.defaultText;
                    const isOverridden = ov.text !== undefined || ov.visible !== undefined;
                    return (
                      <div key={line.key} className={`flex items-start gap-2 rounded border px-2 py-1.5 ${visible ? 'border-steel-200 bg-white' : 'border-steel-200 bg-steel-50 opacity-60'}`}>
                        <button
                          type="button"
                          title={visible ? 'Hide line' : 'Show line'}
                          onClick={() => dispatch({ type: 'UPDATE_QUOTE_SCOPE_LINE', key: line.key, patch: { visible: !visible } })}
                          className={`mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${visible ? 'border-fire-500 bg-fire-500' : 'border-steel-300 bg-white'}`}
                        >
                          {visible && <Check size={11} className="text-white" />}
                        </button>
                        <textarea
                          value={text}
                          onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_SCOPE_LINE', key: line.key, patch: { text: e.target.value } })}
                          rows={1}
                          className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white"
                        />
                        {isOverridden && (
                          <button
                            type="button"
                            title="Reset to default"
                            onClick={() => dispatch({ type: 'RESET_QUOTE_SCOPE_LINE', key: line.key })}
                            className="mt-0.5 rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-steel-700"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {customScope.map(cl => (
                    <div key={cl.id} className="flex items-start gap-2 rounded border border-fire-200 bg-fire-50/30 px-2 py-1.5">
                      <span className="mt-1 inline-block rounded bg-fire-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Custom</span>
                      <textarea
                        value={cl.text}
                        onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_SCOPE_CUSTOM', id: cl.id, text: e.target.value })}
                        rows={1}
                        placeholder="Custom scope line..."
                        className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white"
                      />
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => dispatch({ type: 'DELETE_QUOTE_SCOPE_CUSTOM', id: cl.id })}
                        className="mt-0.5 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'ADD_QUOTE_SCOPE_CUSTOM', text: '' })}
                    className="inline-flex items-center gap-1 rounded border border-dashed border-fire-400 bg-white px-3 py-1.5 text-xs font-semibold text-fire-600 hover:bg-fire-50"
                  >
                    <Plus size={13} /> Add custom line
                  </button>
                </div>
              );
            })()}
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
                    {pricingItems.map((it, idx) => (
                      <tr key={'pi-'+idx}>
                        <td className="px-4 py-2.5 text-steel-700">{it.label}</td>
                        <td className="px-4 py-2.5 text-right text-steel-800">
                          {fmt(it.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-silver-50">
                    <td className="px-4 py-2.5 font-semibold text-steel-900">Subtotal</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-steel-900">
                      {fmt(pricingItems.reduce((s,r)=>s+(Number(r.total)||0),0))}
                    </td>
                  </tr>
                  {summary.markupAmount > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 text-steel-700">
                        Markup ({fmtNum(summary.markupPercent, 1)}%)
                      </td>
                      <td className="px-4 py-2.5 text-right text-steel-800">
                        {fmt(pricingItems.reduce((s,r)=>s+(Number(r.total)||0),0) * (Number(summary.markupPercent)||0) / 100)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-fire-50">
                    <td className="px-4 py-3 text-base font-bold text-fire-700">Bid Price</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-fire-700">
                      {fmt(pricingItems.reduce((s,r)=>s+(Number(r.total)||0),0) * (1 + (Number(summary.markupPercent)||0)/100))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-steel-700">
                      HST ({fmtNum(summary.hstPercent, 1)}%)
                    </td>
                    <td className="px-4 py-2.5 text-right text-steel-800">
                      {fmt(pricingItems.reduce((s,r)=>s+(Number(r.total)||0),0) * (1 + (Number(summary.markupPercent)||0)/100) * (Number(summary.hstPercent)||0) / 100)}
                    </td>
                  </tr>
                  <tr className="bg-steel-800">
                    <td className="px-4 py-3 text-base font-bold text-white">Grand Total</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-fire-400">
                      {fmt(pricingItems.reduce((s,r)=>s+(Number(r.total)||0),0) * (1 + (Number(summary.markupPercent)||0)/100) * (1 + (Number(summary.hstPercent)||0)/100))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Exclusions */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold uppercase tracking-wide text-steel-900">
                Exclusions
              </h3>
              <button
                type="button"
                onClick={() => setEditingExcl(v => !v)}
                className="print:hidden inline-flex items-center gap-1 rounded border border-steel-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-600 hover:bg-steel-50 hover:text-steel-900 transition"
              >
                {editingExcl ? <Check size={12} /> : <Pencil size={12} />}
                {editingExcl ? 'Done' : 'Edit'}
              </button>
            </div>
            {(() => {
              const defaultExcl = [
                { key: 'fireproof', text: 'Fireproofing of structural steel' },
                { key: 'concrete', text: 'Concrete, masonry, and foundations' },
                { key: 'paint', text: 'Painting beyond standard shop primer' },
                { key: 'hoist', text: 'Hoisting or placing materials for other trades' },
                { key: 'permits', text: 'Permit fees and inspection costs' },
                { key: 'demo', text: 'Demolition or removal of existing steel' },
                { key: 'engstamps', text: 'Engineering stamps (unless specified in scope)' },
                { key: 'overtime', text: 'Night or overtime work (unless priced separately)' },
              ];
              const visibleExcl = defaultExcl.map(line => {
                const ov = exclOverrides[line.key] || {};
                const visible = ov.visible !== undefined ? ov.visible : true;
                const text = ov.text !== undefined ? ov.text : line.text;
                return { ...line, visible, text, isOverridden: ov.text !== undefined || ov.visible !== undefined };
              }).filter(l => l.visible);

              if (!editingExcl) {
                return (
                  <ul className="list-inside list-disc space-y-1 text-sm text-steel-600">
                    {visibleExcl.map(line => (<li key={line.key}>{line.text}</li>))}
                    {customExcl.map(cl => (<li key={cl.id}>{cl.text}</li>))}
                  </ul>
                );
              }
              return (
                <div className="space-y-2 print:hidden">
                  {defaultExcl.map(line => {
                    const ov = exclOverrides[line.key] || {};
                    const visible = ov.visible !== undefined ? ov.visible : true;
                    const text = ov.text !== undefined ? ov.text : line.text;
                    const isOverridden = ov.text !== undefined || ov.visible !== undefined;
                    return (
                      <div key={line.key} className={`flex items-start gap-2 rounded border px-2 py-1.5 ${visible ? 'border-steel-200 bg-white' : 'border-steel-200 bg-steel-50 opacity-60'}`}>
                        <button type="button" title={visible ? 'Hide' : 'Show'} onClick={() => dispatch({ type: 'UPDATE_QUOTE_EXCL_LINE', key: line.key, patch: { visible: !visible } })} className={`mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${visible ? 'border-fire-500 bg-fire-500' : 'border-steel-300 bg-white'}`}>
                          {visible && <Check size={11} className="text-white" />}
                        </button>
                        <textarea value={text} onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_EXCL_LINE', key: line.key, patch: { text: e.target.value } })} rows={1} className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white" />
                        {isOverridden && (
                          <button type="button" title="Reset" onClick={() => dispatch({ type: 'RESET_QUOTE_EXCL_LINE', key: line.key })} className="mt-0.5 rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-steel-700">
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {customExcl.map(cl => (
                    <div key={cl.id} className="flex items-start gap-2 rounded border border-fire-200 bg-fire-50/30 px-2 py-1.5">
                      <span className="mt-1 inline-block rounded bg-fire-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Custom</span>
                      <textarea value={cl.text} onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_EXCL_CUSTOM', id: cl.id, text: e.target.value })} rows={1} placeholder="Custom exclusion..." className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white" />
                      <button type="button" title="Delete" onClick={() => dispatch({ type: 'DELETE_QUOTE_EXCL_CUSTOM', id: cl.id })} className="mt-0.5 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => dispatch({ type: 'ADD_QUOTE_EXCL_CUSTOM', text: '' })} className="inline-flex items-center gap-1 rounded border border-dashed border-fire-400 bg-white px-3 py-1.5 text-xs font-semibold text-fire-600 hover:bg-fire-50">
                    <Plus size={13} /> Add custom exclusion
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Terms & Conditions */}
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold uppercase tracking-wide text-steel-900">
                Terms &amp; Conditions
              </h3>
              <button
                type="button"
                onClick={() => setEditingTerms(v => !v)}
                className="print:hidden inline-flex items-center gap-1 rounded border border-steel-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-600 hover:bg-steel-50 hover:text-steel-900 transition"
              >
                {editingTerms ? <Check size={12} /> : <Pencil size={12} />}
                {editingTerms ? 'Done' : 'Edit'}
              </button>
            </div>
            {(() => {
              const defaultTerms = [
                { key: 'validity', text: 'This quotation is valid for 30 days from the date above.' },
                { key: 'payment', text: 'Payment terms: 10% deposit upon acceptance, progress billing monthly, net 30 days.' },
                { key: 'mobilization', text: 'Mobilization within 4-6 weeks of shop drawing approval, subject to current production schedule.' },
                { key: 'changes', text: 'Any changes to the scope of work will be subject to a written change order and adjusted pricing.' },
                { key: 'liability', text: 'Triple Weld Inc. carries comprehensive general liability and CWB certification for all welding operations.' },
                { key: 'access', text: 'Owner/GC to provide clear, level access to the erection area and timely approval of shop drawings.' },
              ];
              const visibleTerms = defaultTerms.map(line => {
                const ov = termsOverrides[line.key] || {};
                const visible = ov.visible !== undefined ? ov.visible : true;
                const text = ov.text !== undefined ? ov.text : line.text;
                return { ...line, visible, text, isOverridden: ov.text !== undefined || ov.visible !== undefined };
              }).filter(l => l.visible);

              if (!editingTerms) {
                return (
                  <ol className="list-inside list-decimal space-y-1.5 text-sm text-steel-600">
                    {visibleTerms.map(line => (<li key={line.key}>{line.text}</li>))}
                    {customTerms.map(cl => (<li key={cl.id}>{cl.text}</li>))}
                  </ol>
                );
              }
              return (
                <div className="space-y-2 print:hidden">
                  {defaultTerms.map(line => {
                    const ov = termsOverrides[line.key] || {};
                    const visible = ov.visible !== undefined ? ov.visible : true;
                    const text = ov.text !== undefined ? ov.text : line.text;
                    const isOverridden = ov.text !== undefined || ov.visible !== undefined;
                    return (
                      <div key={line.key} className={`flex items-start gap-2 rounded border px-2 py-1.5 ${visible ? 'border-steel-200 bg-white' : 'border-steel-200 bg-steel-50 opacity-60'}`}>
                        <button type="button" title={visible ? 'Hide' : 'Show'} onClick={() => dispatch({ type: 'UPDATE_QUOTE_TERMS_LINE', key: line.key, patch: { visible: !visible } })} className={`mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${visible ? 'border-fire-500 bg-fire-500' : 'border-steel-300 bg-white'}`}>
                          {visible && <Check size={11} className="text-white" />}
                        </button>
                        <textarea value={text} onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_TERMS_LINE', key: line.key, patch: { text: e.target.value } })} rows={2} className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white" />
                        {isOverridden && (
                          <button type="button" title="Reset" onClick={() => dispatch({ type: 'RESET_QUOTE_TERMS_LINE', key: line.key })} className="mt-0.5 rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-steel-700">
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {customTerms.map(cl => (
                    <div key={cl.id} className="flex items-start gap-2 rounded border border-fire-200 bg-fire-50/30 px-2 py-1.5">
                      <span className="mt-1 inline-block rounded bg-fire-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Custom</span>
                      <textarea value={cl.text} onChange={(e) => dispatch({ type: 'UPDATE_QUOTE_TERMS_CUSTOM', id: cl.id, text: e.target.value })} rows={2} placeholder="Custom term..." className="flex-1 resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-steel-800 outline-none focus:border-fire-300 focus:bg-white" />
                      <button type="button" title="Delete" onClick={() => dispatch({ type: 'DELETE_QUOTE_TERMS_CUSTOM', id: cl.id })} className="mt-0.5 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => dispatch({ type: 'ADD_QUOTE_TERMS_CUSTOM', text: '' })} className="inline-flex items-center gap-1 rounded border border-dashed border-fire-400 bg-white px-3 py-1.5 text-xs font-semibold text-fire-600 hover:bg-fire-50">
                    <Plus size={13} /> Add custom term
                  </button>
                </div>
              );
            })()}
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
