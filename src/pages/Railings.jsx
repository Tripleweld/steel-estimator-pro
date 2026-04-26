import React, { useState, useCallback, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';

/* ═══════════════════════════════════════════════════════════════
   RAILINGS — Parametric Calculator with OBC Validation
   Mirrors Excel Estimator Pro v5.1 "Railings" tab
   ═══════════════════════════════════════════════════════════════ */

const RAIL_TYPES = ['Guardrail', 'Handrail', 'Wall-Mounted Handrail', 'Intermediate Rail'];
const FINISHES = ['Paint', 'Galvanized', 'Stainless Steel 304', 'Stainless Steel 316', 'Powder Coated'];
const INSTALL_METHODS = ['Baseplate', 'Core Drill'];
const ANCHOR_TYPES = ['Galvanized', 'Stainless Steel'];

/* Component rows in the BOM — order matches Excel */
const COMPONENTS = [
  { key: 'topRail',      label: 'Top rail',           section: 'Pipe 38 Sch40', lbPerFt: 2.72,  notes: 'continuous + returns' },
  { key: 'bottomRail',   label: 'Bottom rail',        section: 'Pipe 38 Sch40', lbPerFt: 2.72,  notes: 'guardrail only' },
  { key: 'posts',        label: 'Posts',              section: 'HSS 38x38x3.2', lbPerFt: 2.41,  notes: 'vertical posts' },
  { key: 'pickets',      label: 'Pickets (vertical)', section: 'SQ 13x13',      lbPerFt: 0.45,  notes: 'only for guardrail' },
  { key: 'intermediate', label: 'Intermediate rail',  section: 'FB 38x10',      lbPerFt: 1.92,  notes: 'mid-rail' },
  { key: 'brackets',     label: 'Wall brackets',      section: 'L76x76x6',      lbPerFt: 4.90,  notes: 'every 4 ft' },
  { key: 'returns',      label: 'Returns / ends',     section: 'Pipe 38 Sch40', lbPerFt: 2.72,  notes: 'wall returns' },
  { key: 'basePlates',   label: 'Base plates',        section: 'FB 102x13',     lbPerFt: 6.81,  notes: '~5" plate per post' },
];

/* Default fab minutes per piece per component (Excel hours × 60) */
const DEFAULT_FAB_MIN = {
  topRail:      { setup: 6, cut: 5, drill: 0, feed: 6, weld: 9, grind: 6, paint: 3 },
  bottomRail:   { setup: 6, cut: 5, drill: 0, feed: 6, weld: 9, grind: 6, paint: 3 },
  posts:        { setup: 5, cut: 3, drill: 3, feed: 3, weld: 7, grind: 3, paint: 2 },
  pickets:      { setup: 1, cut: 2, drill: 0, feed: 1, weld: 5, grind: 2, paint: 1 },
  intermediate: { setup: 5, cut: 3, drill: 0, feed: 3, weld: 6, grind: 3, paint: 2 },
  brackets:     { setup: 3, cut: 3, drill: 5, feed: 2, weld: 6, grind: 3, paint: 1 },
  returns:      { setup: 3, cut: 3, drill: 0, feed: 3, weld: 6, grind: 5, paint: 2 },
  basePlates:   { setup: 2, cut: 3, drill: 5, feed: 2, weld: 6, grind: 3, paint: 1 },
};

/* Default install minutes per piece per component */
const DEFAULT_INST_MIN = {
  topRail:      { unload: 3, rig: 6, fit: 5, bolt: 6, touchUp: 2, qc: 1 },
  bottomRail:   { unload: 3, rig: 6, fit: 5, bolt: 6, touchUp: 2, qc: 1 },
  posts:        { unload: 3, rig: 5, fit: 5, bolt: 7, touchUp: 3, qc: 2 },
  pickets:      { unload: 1, rig: 2, fit: 2, bolt: 3, touchUp: 1, qc: 1 },
  intermediate: { unload: 3, rig: 5, fit: 5, bolt: 6, touchUp: 2, qc: 1 },
  brackets:     { unload: 2, rig: 3, fit: 3, bolt: 5, touchUp: 2, qc: 1 },
  returns:      { unload: 2, rig: 3, fit: 3, bolt: 5, touchUp: 2, qc: 1 },
  basePlates:   { unload: 2, rig: 3, fit: 3, bolt: 6, touchUp: 3, qc: 2 },
};

const FAB_OPS = ['setup', 'cut', 'drill', 'feed', 'weld', 'grind', 'paint'];
const FAB_OP_LABELS = ['Setup', 'Cut', 'Drill', 'Feed/Fit', 'Weld', 'Grind', 'Paint/QC'];
const INST_OPS = ['unload', 'rig', 'fit', 'bolt', 'touchUp', 'qc'];
const INST_OP_LABELS = ['Unload', 'Rig/Lift', 'Fit/Align', 'Bolt/Weld', 'Touch-up', 'QC'];

/* ─── Helpers ─── */
const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmtNum = (v, d = 0) => {
  if (v == null || isNaN(v)) return d === 0 ? '0' : '0.' + '0'.repeat(d);
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtDollar = (v) => '$' + fmtNum(v, 0);

/* Build a default railing row (gets merged with reducer's defaults) */
function defaultRailingExtras() {
  const fabMin = {};
  const instMin = {};
  COMPONENTS.forEach(c => {
    fabMin[c.key] = { ...DEFAULT_FAB_MIN[c.key] };
    instMin[c.key] = { ...DEFAULT_INST_MIN[c.key] };
  });
  const lbPerFtOverride = {};
  COMPONENTS.forEach(c => { lbPerFtOverride[c.key] = ''; });
  return {
    mark: '',
    drawingRef: '',
    finish: 'Paint',
    incl: { topRail: true, bottomRail: true, posts: true, pickets: true, intermediate: false, brackets: false, returns: true, basePlates: true },
    complexity: 1.1,
    postSpacingFt: 4,
    railsTopBot: 2,
    picketSpacingMm: 100,
    returnsCount: 2,
    installMethod: 'Baseplate',
    anchorType: 'Galvanized',
    anchorCostPerSet: 8,
    coreDrillRentalDay: 175,
    groutPerPost: 20,
    fabMin,
    instMin,
    lbPerFtOverride,
    fabOverrideHrs: '',
    instOverrideHrs: '',
    fabCrew: 2,
    instCrew: 4,
    qty: 1,
    labourMethod: 'Detailed',
    fabHrsPerLb: 0.03,
    instHrsPerLb: 0.015,
  };
}

/* Compute everything for a single railing */
function computeRailing(row, materialRates, galvRatePerLb, fabRate, installRate, wasteFactor) {
  const lengthFt = toNum(row.lengthFt);
  const heightMm = toNum(row.heightMm);
  const postSp = toNum(row.postSpacingFt);
  const picketSp = toNum(row.picketSpacingMm) || 100;
  const complexity = toNum(row.complexity) || 1;
  const type = row.type || 'Guardrail';
  const isGuard = type === 'Guardrail';
  const isWallHr = type === 'Wall-Mounted Handrail';
  const isInter = type === 'Intermediate Rail';

  // Include toggles — per-component on/off (defaults derived from type)
  const incl = row.incl || {
    topRail: true,
    bottomRail: isGuard,
    posts: true,
    pickets: isGuard,
    intermediate: isInter,
    brackets: isWallHr,
    returns: true,
    basePlates: row.installMethod === 'Baseplate',
  };

  // Auto-derived counts (only when included)
  const postsCount = (incl.posts && postSp > 0) ? Math.ceil(lengthFt / postSp) + 1 : 0;
  const picketsCount = incl.pickets ? Math.ceil((lengthFt * 304.8) / picketSp) : 0;
  const returnsCount = toNum(row.returnsCount);

  // Per-component qty + length-each
  const qtyMap = {
    topRail: incl.topRail ? 1 : 0,
    bottomRail: incl.bottomRail ? 1 : 0,
    posts: postsCount,
    pickets: picketsCount,
    intermediate: incl.intermediate ? 2 : 0,
    brackets: incl.brackets ? Math.ceil(lengthFt / 4) + 1 : 0,
    returns: incl.returns ? returnsCount * 2 : 0,
    basePlates: incl.basePlates ? postsCount : 0,
  };
  const lenEachFt = {
    topRail: lengthFt,
    bottomRail: lengthFt,
    posts: heightMm / 304.8,
    pickets: Math.max(0, (heightMm - 150) / 304.8),
    intermediate: lengthFt,
    brackets: 1,
    returns: 0.5,
    basePlates: 0.5,
  };

  // Material rate map: $/lb by material name
  const matRateMap = {};
  (materialRates || []).forEach(r => { matRateMap[r.item] = toNum(r.rate); });
  const rateStruct = matRateMap['Structural steel'] || 1.00;
  const rateGalv = matRateMap['Galvanized steel'] || 1.20;
  const rateSS304 = matRateMap['Stainless Steel 304'] || matRateMap['Stainless steel'] || 3.50;
  const rateSS316 = matRateMap['Stainless Steel 316'] || 5.50;
  const finishCfg = {
    'Paint':              { matRate: rateStruct, upcharge: 0 },
    'Galvanized':         { matRate: rateGalv,   upcharge: galvRatePerLb || 0.80 },
    'Stainless Steel 304':{ matRate: rateSS304,  upcharge: 0 },
    'Stainless Steel 316':{ matRate: rateSS316,  upcharge: 0 },
    'Powder Coated':      { matRate: rateStruct, upcharge: 1.50 },
  };
  const fc = finishCfg[row.finish] || finishCfg['Paint'];
  const matRate = fc.matRate;
  const finishUpcharge = fc.upcharge;

  // BOM rows
  const bom = COMPONENTS.map(c => {
    const qty = qtyMap[c.key];
    const lenEa = lenEachFt[c.key];
    const totalLnFt = qty * lenEa;
    const lbPerFt = row.lbPerFtOverride && row.lbPerFtOverride[c.key] !== '' && row.lbPerFtOverride[c.key] != null
      ? toNum(row.lbPerFtOverride[c.key])
      : c.lbPerFt;
    const totalLbs = totalLnFt * lbPerFt;
    const galvCost = totalLbs * finishUpcharge;
    const matCost = totalLbs * matRate;
    return { ...c, qty, lenEa, totalLnFt, lbPerFt, totalLbs, galvCost, matCost };
  });

  const totalLbs = bom.reduce((s, r) => s + r.totalLbs, 0);
  const matSubtotal = bom.reduce((s, r) => s + r.matCost, 0) * (1 + (wasteFactor || 0.03));
  const galvSubtotal = bom.reduce((s, r) => s + r.galvCost, 0);

  // Labour — Detailed (sub-steps SUMPRODUCT) or Simple (Hrs/lb × lbs)
  let fabHrsPerPc = 0, instHrsPerPc = 0;
  let fabBaseHrs = 0, instBaseHrs = 0;
  bom.forEach(b => {
    const fm = (row.fabMin && row.fabMin[b.key]) || DEFAULT_FAB_MIN[b.key];
    const im = (row.instMin && row.instMin[b.key]) || DEFAULT_INST_MIN[b.key];
    const fHrsPerPc = (FAB_OPS.reduce((s, op) => s + toNum(fm[op]), 0)) / 60;
    const iHrsPerPc = (INST_OPS.reduce((s, op) => s + toNum(im[op]), 0)) / 60;
    fabBaseHrs += fHrsPerPc * b.qty;
    instBaseHrs += iHrsPerPc * b.qty;
  });

  let fabHrs, instHrs;
  if (row.labourMethod === 'Simple') {
    fabHrs = totalLbs * toNum(row.fabHrsPerLb || 0.03) * complexity;
    instHrs = totalLbs * toNum(row.instHrsPerLb || 0.015) * complexity;
  } else {
    fabHrs = fabBaseHrs * complexity;
    instHrs = instBaseHrs * complexity;
  }
  // Override
  if (row.fabOverrideHrs !== '' && row.fabOverrideHrs != null) fabHrs = toNum(row.fabOverrideHrs);
  if (row.instOverrideHrs !== '' && row.instOverrideHrs != null) instHrs = toNum(row.instOverrideHrs);

  const totFab = fabHrs * (toNum(row.fabCrew) || 1);
  const totInst = instHrs * (toNum(row.instCrew) || 1);
  const fabCost = totFab * fabRate;
  const instCost = totInst * installRate;

  // Hardware + Anchors
  const anchorTotal = row.installMethod === 'Baseplate' ? postsCount * toNum(row.anchorCostPerSet) : 0;
  const coreDrillCost = row.installMethod === 'Core Drill' ? Math.ceil(postsCount * 0.5 / 8) * toNum(row.coreDrillRentalDay) : 0;
  const groutCost = row.installMethod === 'Core Drill' ? postsCount * toNum(row.groutPerPost) : 0;
  const installAdderHrs = row.installMethod === 'Core Drill' ? postsCount * 0.25 : 0;
  const installAdderCost = installAdderHrs * installRate;
  const installMethodCost = coreDrillCost + groutCost + installAdderCost;
  const hardwareCost = anchorTotal + matSubtotal * 0.05; // 5% conn hardware allowance

  const grandTotal = matSubtotal + galvSubtotal + fabCost + instCost + hardwareCost + installMethodCost;

  // Benchmarks
  const dPerLnFt = lengthFt > 0 ? grandTotal / lengthFt : 0;
  const dPerLb = totalLbs > 0 ? grandTotal / totalLbs : 0;
  const dPerPost = postsCount > 0 ? grandTotal / postsCount : 0;

  // OBC compliance checks
  const codeLimitGuardMin = 1070;
  const codeLimitHandrailMin = 865;
  const codeLimitHandrailMax = 1065;
  const codeLimitPicketMax = 100;
  const codeLimitPostSpacingMax = 6;
  const checks = {
    guardHeight: !isGuard || heightMm >= codeLimitGuardMin,
    handrailHeight: type !== 'Handrail' || (heightMm >= codeLimitHandrailMin && heightMm <= codeLimitHandrailMax),
    picketSpacing: !isGuard || picketSp <= codeLimitPicketMax,
    postSpacing: postSp <= codeLimitPostSpacingMax,
  };

  return {
    postsCount, picketsCount, bom,
    totalLbs, matSubtotal, galvSubtotal,
    fabHrs, instHrs, totFab, totInst, fabCost, instCost,
    fabBaseHrs, instBaseHrs,
    anchorTotal, coreDrillCost, groutCost, installAdderCost, installMethodCost, hardwareCost,
    grandTotal, dPerLnFt, dPerLb, dPerPost,
    checks,
  };
}

/* ─── Editable cell ─── */
function EditCell({ value, onChange, type = 'text', className = '', placeholder, ...rest }) {
  return (
    <input
      type={type}
      inputMode={type === 'text' ? undefined : 'decimal'}
      value={value ?? ''}
      onChange={onChange}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      className={`bg-blue-500/5 border border-blue-500/30 rounded px-2 py-1 text-sm text-white placeholder-steel-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${className}`}
      {...rest}
    />
  );
}

/* ─── Override cell (auto vs manual, amber highlight) ─── */
function OverrideCell({ calcValue, override, onOverride, decimals = 1, width = 'w-20' }) {
  const isOverridden = override !== '' && override != null;
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <input
      type="text"
      inputMode="decimal"
      value={editing ? raw : (isOverridden ? override : fmtNum(calcValue, decimals))}
      onChange={(e) => setRaw(e.target.value.replace(/[^0-9.]/g, ''))}
      onFocus={(e) => { setEditing(true); setRaw(isOverridden ? String(override) : ''); setTimeout(() => e.target.select(), 0); }}
      onBlur={() => { setEditing(false); if (raw === '') onOverride(''); else { const n = parseFloat(raw); if (!isNaN(n)) onOverride(n); } }}
      className={`${width} text-right rounded px-1 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 ${
        isOverridden ? 'bg-amber-900/40 border border-amber-500/50 text-amber-200' : 'bg-transparent border border-steel-700 text-white'
      }`}
      title={isOverridden ? `Override: ${override} (auto: ${fmtNum(calcValue, decimals)})` : 'Auto-calculated — type to override'}
    />
  );
}

/* ─── Status pill ─── */
function CheckPill({ ok, label, value }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
      ok ? 'bg-green-900/40 text-green-300 border border-green-500/40' : 'bg-red-900/40 text-red-300 border border-red-500/40'
    }`}>
      <span>{ok ? '✓' : '⚠'}</span>
      <span className="font-semibold">{label}</span>
      <span className="opacity-70">{value}</span>
    </span>
  );
}

/* ─── Summary card ─── */
function SummaryCard({ label, value, color = 'blue' }) {
  const colorMap = {
    blue:  'border-blue-400/80 bg-blue-950 text-blue-100',
    amber: 'border-amber-400/80 bg-amber-950 text-amber-100',
    green: 'border-green-400/80 bg-green-950 text-green-100',
    red:   'border-red-400/80 bg-red-950 text-red-100',
    cyan:  'border-cyan-400/80 bg-cyan-950 text-cyan-100',
  };
  return (
    <div className={`rounded-lg border-l-4 p-3 ${colorMap[color]}`}>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RAILING CARD — one expandable card per "Mark"
   ═══════════════════════════════════════════════════════════════ */
function RailingCard({ row, idx, calc, fabRate, installRate, onUpdate, onDelete, onCopy }) {
  const [open, setOpen] = useState(idx === 0);

  const set = (field) => (e) => onUpdate(row.id, { [field]: e.target.value });
  const setNum = (field) => (e) => onUpdate(row.id, { [field]: e.target.value });
  const setSubMin = (kind, comp, op) => (e) => {
    const tree = row[kind] || {};
    const compTree = tree[comp] || {};
    onUpdate(row.id, { [kind]: { ...tree, [comp]: { ...compTree, [op]: e.target.value } } });
  };
  const setLbPerFt = (comp) => (v) => {
    const tree = row.lbPerFtOverride || {};
    onUpdate(row.id, { lbPerFtOverride: { ...tree, [comp]: v } });
  };

  const checks = calc.checks;
  const allOk = Object.values(checks).every(Boolean);

  return (
    <div className="border border-steel-700 rounded-lg bg-steel-900/40 overflow-hidden">
      {/* Card header — collapsed summary */}
      <div className="flex items-center gap-3 px-3 py-2 bg-steel-800/60 border-b border-steel-700">
        <button onClick={() => setOpen(!open)} className="text-steel-400 hover:text-white text-sm">
          {open ? '▼' : '▶'}
        </button>
        <span className="font-mono text-xs text-steel-500 w-6 text-right">{idx + 1}</span>
        <input
          type="text"
          value={row.mark || ''}
          onChange={set('mark')}
          placeholder="R-1"
          className="w-20 bg-blue-500/5 border border-blue-500/30 rounded px-2 py-0.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <select
          value={row.type || 'Guardrail'}
          onChange={set('type')}
          className="bg-steel-900 border border-blue-500/30 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
        >
          {RAIL_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#0c1222' }}>{t}</option>)}
        </select>
        <input
          type="text"
          value={row.location || ''}
          onChange={set('location')}
          placeholder="Location (e.g. Mezzanine)"
          className="flex-1 min-w-[140px] bg-blue-500/5 border border-blue-500/30 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
        />
        <span className="text-[11px] text-steel-400 font-mono whitespace-nowrap">
          {fmtNum(toNum(row.lengthFt), 1)} lnft · {fmtNum(calc.totalLbs)} lb · {fmtNum(calc.totFab, 1)}h fab · {fmtNum(calc.totInst, 1)}h inst
        </span>
        <span className={`text-sm font-bold font-mono ${allOk ? 'text-green-400' : 'text-amber-400'}`}>
          {fmtDollar(calc.grandTotal)}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${allOk ? 'bg-green-900/40 text-green-300' : 'bg-amber-900/40 text-amber-300'}`}>
          {allOk ? 'OBC OK' : 'OBC ⚠'}
        </span>
        <button onClick={() => onCopy(row)} title="Duplicate" className="text-steel-400 hover:text-blue-400 text-sm">⎘</button>
        <button onClick={() => onDelete(row.id)} title="Delete" className="text-steel-400 hover:text-red-400 text-sm">✕</button>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          {/* ─── BLOCK 1: Identification + Geometry + Install ─── */}
          <div className="grid grid-cols-3 gap-3">
            {/* Identification */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fire-400 mb-1.5">Identification</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label className="text-steel-400">Drawing Ref</label>
                <EditCell value={row.drawingRef} onChange={set('drawingRef')} placeholder="A-301" className="w-full" />
                <label className="text-steel-400">Finish</label>
                <select value={row.finish || 'Paint'} onChange={set('finish')} className="bg-steel-900 border border-blue-500/30 rounded px-2 py-1 text-xs text-white">
                  {FINISHES.map(f => <option key={f} value={f} style={{ backgroundColor: '#0c1222' }}>{f}</option>)}
                </select>
                <label className="text-steel-400">Qty (multi)</label>
                <EditCell value={row.qty} onChange={setNum('qty')} className="w-full text-right" />
                <label className="text-steel-400">Notes</label>
                <EditCell value={row.notes} onChange={set('notes')} placeholder="..." className="w-full" />
              </div>
            </div>

            {/* Geometry */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fire-400 mb-1.5">Geometry Inputs</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label className="text-steel-400">Length (lnft)</label>
                <EditCell value={row.lengthFt} onChange={setNum('lengthFt')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Height (mm)</label>
                <EditCell value={row.heightMm} onChange={setNum('heightMm')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Post Spacing (ft)</label>
                <EditCell value={row.postSpacingFt} onChange={setNum('postSpacingFt')} className="w-full text-right font-mono" />
                <label className="text-steel-400"># Posts (auto)</label>
                <span className="text-right font-mono text-cyan-300">{calc.postsCount}</span>
                <label className="text-steel-400">Picket Spacing (mm)</label>
                <EditCell value={row.picketSpacingMm} onChange={setNum('picketSpacingMm')} className="w-full text-right font-mono" />
                <label className="text-steel-400"># Pickets (auto)</label>
                <span className="text-right font-mono text-cyan-300">{calc.picketsCount}</span>
                <label className="text-steel-400"># Returns/Ends</label>
                <EditCell value={row.returnsCount} onChange={setNum('returnsCount')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Complexity (1-1.5x)</label>
                <EditCell value={row.complexity} onChange={setNum('complexity')} className="w-full text-right font-mono" />
              </div>
            </div>

            {/* Install Method */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fire-400 mb-1.5">Install Method</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label className="text-steel-400">Method</label>
                <select value={row.installMethod || 'Baseplate'} onChange={set('installMethod')} className="bg-steel-900 border border-blue-500/30 rounded px-2 py-1 text-xs text-white">
                  {INSTALL_METHODS.map(m => <option key={m} value={m} style={{ backgroundColor: '#0c1222' }}>{m}</option>)}
                </select>
                <label className="text-steel-400">Anchor Type</label>
                <select value={row.anchorType || 'Galvanized'} onChange={set('anchorType')} className="bg-steel-900 border border-blue-500/30 rounded px-2 py-1 text-xs text-white">
                  {ANCHOR_TYPES.map(m => <option key={m} value={m} style={{ backgroundColor: '#0c1222' }}>{m}</option>)}
                </select>
                <label className="text-steel-400">Anchor $/set</label>
                <EditCell value={row.anchorCostPerSet} onChange={setNum('anchorCostPerSet')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Core Drill $/day</label>
                <EditCell value={row.coreDrillRentalDay} onChange={setNum('coreDrillRentalDay')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Grout $/post</label>
                <EditCell value={row.groutPerPost} onChange={setNum('groutPerPost')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Fab Crew</label>
                <EditCell value={row.fabCrew} onChange={setNum('fabCrew')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Inst Crew</label>
                <EditCell value={row.instCrew} onChange={setNum('instCrew')} className="w-full text-right font-mono" />
              </div>
            </div>
          </div>

          {/* ─── BLOCK 2: OBC Compliance ─── */}
          <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fire-400 mb-1.5">OBC Code Compliance</div>
            <div className="flex flex-wrap gap-1.5">
              <CheckPill ok={checks.guardHeight}    label="Guard ≥ 1070mm"     value={`${row.heightMm}mm`} />
              <CheckPill ok={checks.handrailHeight} label="Handrail 865-1065"  value={`${row.heightMm}mm`} />
              <CheckPill ok={checks.picketSpacing}  label="Picket ≤ 100mm"     value={`${row.picketSpacingMm}mm`} />
              <CheckPill ok={checks.postSpacing}    label="Post ≤ 6ft"         value={`${row.postSpacingFt}ft`} />
            </div>
          </div>

          {/* ─── BLOCK 3: Material BOM ─── */}
          <div className="border border-steel-700 rounded overflow-hidden">
            <div className="px-2 py-1 bg-steel-800/60 text-[10px] font-bold uppercase tracking-wider text-fire-400">Material BOM</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-steel-800/40">
                  <tr className="text-[10px] text-steel-400 uppercase">
                    <th className="px-2 py-1 text-center">Incl</th>
                    <th className="px-2 py-1 text-left">Item</th>
                    <th className="px-2 py-1 text-left">Section</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Len ea (ft)</th>
                    <th className="px-2 py-1 text-right">Total lnft</th>
                    <th className="px-2 py-1 text-right">lb/ft</th>
                    <th className="px-2 py-1 text-right">Total lbs</th>
                    <th className="px-2 py-1 text-right">Finish $</th>
                    <th className="px-2 py-1 text-right">Material $</th>
                    <th className="px-2 py-1 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.bom.map((b) => {
                    const inclMap = row.incl || {};
                    const isOn = inclMap[b.key] !== false && (inclMap[b.key] === true || b.qty > 0);
                    return (
                    <tr key={b.key} className={`border-t border-steel-800/60 ${isOn ? '' : 'opacity-50'}`}>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={!!inclMap[b.key]}
                          onChange={(e) => onUpdate(row.id, { incl: { ...inclMap, [b.key]: e.target.checked } })}
                          className="accent-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1 text-white">{b.label}</td>
                      <td className="px-2 py-1 text-steel-300 font-mono">{b.section}</td>
                      <td className="px-2 py-1 text-right text-cyan-300 font-mono">{fmtNum(b.qty)}</td>
                      <td className="px-2 py-1 text-right text-steel-300 font-mono">{fmtNum(b.lenEa, 2)}</td>
                      <td className="px-2 py-1 text-right text-steel-300 font-mono">{fmtNum(b.totalLnFt, 2)}</td>
                      <td className="px-2 py-1 text-right">
                        <OverrideCell
                          calcValue={b.lbPerFt}
                          override={(row.lbPerFtOverride && row.lbPerFtOverride[b.key]) ?? ''}
                          onOverride={setLbPerFt(b.key)}
                          decimals={2}
                          width="w-16"
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-white font-mono">{fmtNum(b.totalLbs, 1)}</td>
                      <td className="px-2 py-1 text-right text-steel-300 font-mono">{fmtDollar(b.galvCost)}</td>
                      <td className="px-2 py-1 text-right text-green-400 font-mono">{fmtDollar(b.matCost)}</td>
                      <td className="px-2 py-1 text-steel-500 text-[10px]">{b.notes}</td>
                    </tr>
                    );
                  })}
                  <tr className="bg-steel-800/40 border-t border-steel-600 font-semibold">
                    <td colSpan={7} className="px-2 py-1.5 text-right text-steel-300 uppercase text-[10px]">Material Subtotal (incl. 3% waste) →</td>
                    <td className="px-2 py-1.5 text-right text-white font-mono">{fmtNum(calc.totalLbs, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-amber-300 font-mono">{fmtDollar(calc.galvSubtotal)}</td>
                    <td className="px-2 py-1.5 text-right text-green-400 font-mono">{fmtDollar(calc.matSubtotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── BLOCK 4: Fab Time Breakdown (minutes) ─── */}
          <div className="border border-steel-700 rounded overflow-hidden">
            <div className="px-2 py-1 bg-steel-800/60 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Fab Time Breakdown — minutes per piece by activity (blue = editable)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-steel-800/40">
                  <tr className="text-[10px] text-steel-400 uppercase">
                    <th className="px-2 py-1 text-left">Component</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    {FAB_OP_LABELS.map(l => <th key={l} className="px-2 py-1 text-right">{l} (min)</th>)}
                    <th className="px-2 py-1 text-right">Hrs/pc</th>
                    <th className="px-2 py-1 text-right">Tot Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.bom.map((b) => {
                    const fm = (row.fabMin && row.fabMin[b.key]) || DEFAULT_FAB_MIN[b.key];
                    const hrsPerPc = FAB_OPS.reduce((s, op) => s + toNum(fm[op]), 0) / 60;
                    const tot = hrsPerPc * b.qty;
                    return (
                      <tr key={b.key} className="border-t border-steel-800/60">
                        <td className="px-2 py-1 text-white">{b.label}</td>
                        <td className="px-2 py-1 text-right text-cyan-300 font-mono">{fmtNum(b.qty)}</td>
                        {FAB_OPS.map(op => (
                          <td key={op} className="px-1 py-1 text-right">
                            <EditCell value={fm[op]} onChange={setSubMin('fabMin', b.key, op)} className="w-12 text-right font-mono" />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right text-amber-300 font-mono">{fmtNum(hrsPerPc, 2)}</td>
                        <td className="px-2 py-1 text-right text-amber-300 font-mono font-bold">{fmtNum(tot, 1)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-steel-800/40 border-t border-steel-600 font-semibold">
                    <td colSpan={9} className="px-2 py-1.5 text-right text-steel-300 uppercase text-[10px]">Fab base hrs × complexity ({fmtNum(toNum(row.complexity), 2)}x) →</td>
                    <td className="px-2 py-1.5 text-right text-amber-300 font-mono">{fmtNum(calc.fabBaseHrs * toNum(row.complexity), 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── BLOCK 5: Install Time Breakdown (minutes) ─── */}
          <div className="border border-steel-700 rounded overflow-hidden">
            <div className="px-2 py-1 bg-steel-800/60 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Install Time Breakdown — minutes per piece by activity
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-steel-800/40">
                  <tr className="text-[10px] text-steel-400 uppercase">
                    <th className="px-2 py-1 text-left">Component</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    {INST_OP_LABELS.map(l => <th key={l} className="px-2 py-1 text-right">{l} (min)</th>)}
                    <th className="px-2 py-1 text-right">Hrs/pc</th>
                    <th className="px-2 py-1 text-right">Tot Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.bom.map((b) => {
                    const im = (row.instMin && row.instMin[b.key]) || DEFAULT_INST_MIN[b.key];
                    const hrsPerPc = INST_OPS.reduce((s, op) => s + toNum(im[op]), 0) / 60;
                    const tot = hrsPerPc * b.qty;
                    return (
                      <tr key={b.key} className="border-t border-steel-800/60">
                        <td className="px-2 py-1 text-white">{b.label}</td>
                        <td className="px-2 py-1 text-right text-cyan-300 font-mono">{fmtNum(b.qty)}</td>
                        {INST_OPS.map(op => (
                          <td key={op} className="px-1 py-1 text-right">
                            <EditCell value={im[op]} onChange={setSubMin('instMin', b.key, op)} className="w-12 text-right font-mono" />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right text-cyan-300 font-mono">{fmtNum(hrsPerPc, 2)}</td>
                        <td className="px-2 py-1 text-right text-cyan-300 font-mono font-bold">{fmtNum(tot, 1)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-steel-800/40 border-t border-steel-600 font-semibold">
                    <td colSpan={8} className="px-2 py-1.5 text-right text-steel-300 uppercase text-[10px]">Install base hrs × complexity →</td>
                    <td className="px-2 py-1.5 text-right text-cyan-300 font-mono">{fmtNum(calc.instBaseHrs * toNum(row.complexity), 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── BLOCK 6: Override + Cost Breakdown + Benchmarks ─── */}
          <div className="grid grid-cols-3 gap-3">
            {/* Overrides */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">Labour Method & Overrides</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label className="text-steel-400">Method</label>
                <select value={row.labourMethod || 'Detailed'} onChange={set('labourMethod')} className="bg-steel-900 border border-blue-500/30 rounded px-2 py-1 text-xs text-white">
                  <option value="Detailed" style={{ backgroundColor: '#0c1222' }}>Detailed (sub-steps)</option>
                  <option value="Simple" style={{ backgroundColor: '#0c1222' }}>Simple (Hrs/lb)</option>
                </select>
                <label className="text-steel-400">Fab Hrs/lb</label>
                <EditCell value={row.fabHrsPerLb} onChange={setNum('fabHrsPerLb')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Inst Hrs/lb</label>
                <EditCell value={row.instHrsPerLb} onChange={setNum('instHrsPerLb')} className="w-full text-right font-mono" />
                <label className="text-steel-400">Fab Hrs Override</label>
                <OverrideCell
                  calcValue={calc.fabHrs}
                  override={row.fabOverrideHrs ?? ''}
                  onOverride={(v) => onUpdate(row.id, { fabOverrideHrs: v })}
                  decimals={1}
                  width="w-full"
                />
                <label className="text-steel-400">Inst Hrs Override</label>
                <OverrideCell
                  calcValue={calc.instHrs}
                  override={row.instOverrideHrs ?? ''}
                  onOverride={(v) => onUpdate(row.id, { instOverrideHrs: v })}
                  decimals={1}
                  width="w-full"
                />
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1.5">Cost Breakdown</div>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Material + Waste</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.matSubtotal)}</td></tr>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Galvanizing</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.galvSubtotal)}</td></tr>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Fab Labour ({fmtNum(calc.totFab,1)} hrs × ${fabRate})</td><td className="py-1 text-right text-amber-300 font-mono">{fmtDollar(calc.fabCost)}</td></tr>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Install Labour ({fmtNum(calc.totInst,1)} hrs × ${installRate})</td><td className="py-1 text-right text-cyan-300 font-mono">{fmtDollar(calc.instCost)}</td></tr>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Hardware + Anchors</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.hardwareCost)}</td></tr>
                  <tr className="border-b border-steel-800/60"><td className="py-1 text-steel-400">Install Method Costs</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.installMethodCost)}</td></tr>
                  <tr className="bg-steel-800/40 font-bold"><td className="py-1.5 text-white uppercase text-[10px] tracking-wider">Grand Total →</td><td className="py-1.5 text-right text-green-400 font-mono">{fmtDollar(calc.grandTotal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Benchmarks */}
            <div className="border border-steel-700 rounded p-2 bg-steel-900/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fire-400 mb-1.5">Benchmarks</div>
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-steel-500 uppercase"><th className="text-left">Metric</th><th className="text-right">Value</th><th className="text-right">Range</th><th className="text-right">Status</th></tr></thead>
                <tbody>
                  <tr className="border-t border-steel-800/60"><td className="py-1 text-steel-300">$/lnft</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.dPerLnFt)}</td><td className="py-1 text-right text-steel-500 text-[10px]">120-280</td><td className="py-1 text-right">{calc.dPerLnFt >= 120 && calc.dPerLnFt <= 280 ? <span className="text-green-400">✓</span> : <span className="text-amber-400">⚠</span>}</td></tr>
                  <tr className="border-t border-steel-800/60"><td className="py-1 text-steel-300">$/lb</td><td className="py-1 text-right text-white font-mono">${fmtNum(calc.dPerLb, 2)}</td><td className="py-1 text-right text-steel-500 text-[10px]">4-9</td><td className="py-1 text-right">{calc.dPerLb >= 4 && calc.dPerLb <= 9 ? <span className="text-green-400">✓</span> : <span className="text-amber-400">⚠</span>}</td></tr>
                  <tr className="border-t border-steel-800/60"><td className="py-1 text-steel-300">$/post</td><td className="py-1 text-right text-white font-mono">{fmtDollar(calc.dPerPost)}</td><td className="py-1 text-right text-steel-500 text-[10px]">300-700</td><td className="py-1 text-right">{calc.dPerPost >= 300 && calc.dPerPost <= 700 ? <span className="text-green-400">✓</span> : <span className="text-amber-400">⚠</span>}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Railings() {
  const { state, dispatch } = useProject();
  const railings = state.railings || [];
  const fabRate = toNum(state.rates?.labourRates?.fabRate ?? 50);
  const installRate = toNum(state.rates?.labourRates?.installRate ?? 55);
  const materialRates = state.rates?.materialRates || [];
  const wasteFactor = toNum(state.rates?.markup?.wasteMisc ?? 3) / 100;
  const galvRatePerLb = 0.80;

  // Pre-fill new rows with extras (the reducer creates a base row; we then update with extras)
  const addRailing = useCallback(() => {
    dispatch({ type: 'ADD_RAILING_ROW' });
    // Mark/extras applied via update on next tick; use setTimeout(0) to ensure id exists
    setTimeout(() => {
      const next = (state.railings || []);
      // Newest is the last added — but we use Date.now ids, so find the highest id not yet enriched
      const target = (next.length ? next[next.length - 1] : null);
      if (target && target.fabMin == null) {
        const extras = defaultRailingExtras();
        const idx = next.length; // 1-based index for default mark
        dispatch({ type: 'UPDATE_RAILING_ROW', payload: { id: target.id, ...extras, mark: `R-${idx}`, lengthFt: target.lengthFt || 20 } });
      }
    }, 0);
  }, [dispatch, state.railings]);

  const updateRailing = useCallback((id, fields) => {
    dispatch({ type: 'UPDATE_RAILING_ROW', payload: { id, ...fields } });
  }, [dispatch]);

  const deleteRailing = useCallback((id) => {
    dispatch({ type: 'DELETE_RAILING_ROW', payload: id });
  }, [dispatch]);

  const copyRailing = useCallback((row) => {
    const newId = Date.now();
    const extras = defaultRailingExtras();
    dispatch({ type: 'ADD_RAILING_ROW' });
    setTimeout(() => {
      const next = (state.railings || []);
      const target = next[next.length - 1];
      if (target) {
        dispatch({ type: 'UPDATE_RAILING_ROW', payload: { ...extras, ...row, id: target.id, mark: (row.mark || 'R') + '-copy' } });
      }
    }, 0);
  }, [dispatch, state.railings]);

  // Compute per-railing totals
  const computed = useMemo(() => railings.map(r => ({
    row: r,
    calc: computeRailing(r, materialRates, galvRatePerLb, fabRate, installRate, wasteFactor),
  })), [railings, materialRates, fabRate, installRate, wasteFactor]);

  // Grand totals across all railings
  const grand = useMemo(() => {
    let totalLnFt = 0, totalLbs = 0, totFab = 0, totInst = 0, matCost = 0, fabCost = 0, instCost = 0, hwCost = 0, instMethodCost = 0, galv = 0, gt = 0;
    let allOk = true;
    computed.forEach(({ row, calc }) => {
      const q = toNum(row.qty) || 1;
      totalLnFt += toNum(row.lengthFt) * q;
      totalLbs += calc.totalLbs * q;
      totFab += calc.totFab * q;
      totInst += calc.totInst * q;
      matCost += calc.matSubtotal * q;
      fabCost += calc.fabCost * q;
      instCost += calc.instCost * q;
      hwCost += calc.hardwareCost * q;
      instMethodCost += calc.installMethodCost * q;
      galv += calc.galvSubtotal * q;
      gt += calc.grandTotal * q;
      if (!Object.values(calc.checks).every(Boolean)) allOk = false;
    });
    return { totalLnFt, totalLbs, totFab, totInst, matCost, fabCost, instCost, hwCost, instMethodCost, galv, gt, allOk, count: computed.length };
  }, [computed]);

  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-4">
      {/* Accent stripe */}
      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-fire-500 to-amber-500" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-fire-400">⛰</span> Railings Takeoff
          </h1>
          <p className="text-steel-400 text-sm mt-0.5">Parametric calculator with OBC compliance — Guards, Handrails, Wall-mounted, Intermediate</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-fire-600/80 text-white text-xs font-semibold rounded">Fab Rate: ${fabRate}/hr</span>
            <span className="px-2 py-0.5 bg-green-600/80 text-white text-xs font-semibold rounded">Install Rate: ${installRate}/hr</span>
            <span className="px-2 py-0.5 bg-steel-700 text-steel-300 text-xs font-mono rounded">{grand.count} railings</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${grand.allOk ? 'bg-green-700/60 text-green-200' : 'bg-amber-700/60 text-amber-200'}`}>
              {grand.allOk ? '✓ All OBC OK' : '⚠ OBC issues — review'}
            </span>
          </div>
        </div>
        <button
          onClick={addRailing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
        >
          + Add Railing
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3">
        <SummaryCard label="Total Length"  value={`${fmtNum(grand.totalLnFt, 1)} lnft`} color="blue" />
        <SummaryCard label="Total Weight"  value={`${fmtNum(grand.totalLbs)} lb`}        color="blue" />
        <SummaryCard label="Fab Hours"     value={fmtNum(grand.totFab, 1)}               color="amber" />
        <SummaryCard label="Install Hours" value={fmtNum(grand.totInst, 1)}              color="cyan" />
        <SummaryCard label="Material $"    value={fmtDollar(grand.matCost + grand.galv)} color="green" />
        <SummaryCard label="Grand Total"   value={fmtDollar(grand.gt)}                   color="red" />
      </div>

      {/* Railing cards */}
      <div className="space-y-2">
        {railings.length === 0 ? (
          <div className="border border-dashed border-steel-700 rounded-lg p-12 text-center bg-steel-900/30">
            <div className="text-steel-400 text-sm">No railings added yet.</div>
            <button onClick={addRailing} className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
              + Add First Railing
            </button>
          </div>
        ) : (
          computed.map(({ row, calc }, idx) => (
            <RailingCard
              key={row.id}
              row={row}
              idx={idx}
              calc={calc}
              fabRate={fabRate}
              installRate={installRate}
              onUpdate={updateRailing}
              onDelete={deleteRailing}
              onCopy={copyRailing}
            />
          ))
        )}
      </div>

      {/* Grand total bar */}
      {railings.length > 0 && (
        <div className="bg-steel-800/80 border border-steel-600 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-lg font-bold text-white uppercase tracking-wider">Grand Totals — All Railings</span>
            <div className="flex gap-5 text-sm font-mono flex-wrap">
              <span className="text-steel-300">{fmtNum(grand.totalLnFt, 1)} lnft</span>
              <span className="text-steel-300">{fmtNum(grand.totalLbs)} lb</span>
              <span className="text-amber-300">{fmtNum(grand.totFab, 1)} fab hrs</span>
              <span className="text-cyan-300">{fmtNum(grand.totInst, 1)} inst hrs</span>
              <span className="text-steel-300">Mat: {fmtDollar(grand.matCost + grand.galv)}</span>
              <span className="text-amber-300">Fab: {fmtDollar(grand.fabCost)}</span>
              <span className="text-cyan-300">Inst: {fmtDollar(grand.instCost)}</span>
              <span className="text-green-400 font-bold text-base">{fmtDollar(grand.gt)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-steel-500 mt-6 pb-2">
        Triple Weld Inc. · Steel Estimator Pro · Excel v5.1 parity
      </div>
    </div>
  );
}
