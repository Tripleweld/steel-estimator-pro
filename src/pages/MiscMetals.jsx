import React, { useState, useMemo, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { searchShapes } from '../data/aisc-shapes';
import { Plus, Trash2, Search, Wrench, ChevronDown, ChevronRight, RotateCcw, Copy } from 'lucide-react';

/* ─── helpers ─── */
const fmt = (v) => (v == null || isNaN(v) ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtNum = (v) => (v == null || isNaN(v) ? '' : Number(v).toLocaleString('en-US'));

const MISC_METAL_TYPES = [
  'Stairs', 'Railings', 'Handrails', 'Guardrails', 'Ladders',
  'Grating', 'Lintels', 'Embeds', 'Bollards', 'Platforms',
  'Catwalks', 'Mezzanine', 'Angles/Channels', 'Plates', 'Other',
];

const emptyRow = () => ({
  id: crypto.randomUUID(),
  mark: '', drawingRef: '', profile: '', qty: 0, lengthFt: 0,
  plateBP: 0, anchorsPerPc: 0,
  fabSetup: 0, fabCut: 0, fabDrill: 0, fabFeed: 0, fabWeld: 0, fabGrind: 0, fabPaint: 0,
  instUnload: 0, instRig: 0, instFit: 0, instBolt: 0, instTouchup: 0, instQC: 0,
  fabCrew: 1, instCrew: 1,
  type: 'Stairs', lbsPerFt: 0, notes: '',
});

/* ─── ProfileSearch sub-component ─── */
function ProfileSearch({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query.length >= 2 ? searchShapes(query) : []), [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-0.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-xs py-1 px-1.5 border border-slate-300 rounded-l bg-white focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none"
          placeholder="Profile"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-1 py-1 border border-l-0 border-slate-300 rounded-r bg-slate-50 hover:bg-slate-100"
        >
          <Search size={12} className="text-slate-500" />
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg">
          <div className="p-1.5">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs py-1 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none"
              placeholder="Search AISC shapes..."
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && (
              <li className="px-3 py-2 text-xs text-slate-400 italic">No shapes found</li>
            )}
            {results.slice(0, 50).map((s) => (
              <li
                key={s.AISC_Manual_Label}
                className="px-3 py-1.5 text-xs hover:bg-purple-50 cursor-pointer flex justify-between"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span className="font-medium">{s.AISC_Manual_Label}</span>
                <span className="text-slate-400">{s.W} lb/ft</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function MiscMetalsTakeoff() {
  const { state, dispatch } = useProject();
  const rows = state.miscMetals || [];
  const rates = state.rates || {};
  const materialRate = rates.materialRates?.miscMetals ?? rates.materialRates?.structural ?? 0.85;
  const fabRate = rates.labourRates?.fabRate ?? 65;
  const installRate = rates.labourRates?.installRate ?? 75;

  /* ─── column group collapse ─── */
  const [collapsed, setCollapsed] = useState({
    identification: false,
    qtyWeight: false,
    connections: false,
    fabrication: false,
    installation: false,
    costPreview: false,
    notes: false,
  });
  const toggle = (g) => setCollapsed((p) => ({ ...p, [g]: !p[g] }));

  /* ─── sorting ─── */
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };
  const sortIndicator = (col) => (sortCol === col ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '');

  /* ─── row CRUD ─── */
  const addRow = () => dispatch({ type: 'ADD_MISC_METAL_ROW', payload: emptyRow() });
  const updateRow = useCallback((id, field, value) => {
    dispatch({ type: 'UPDATE_MISC_METAL_ROW', payload: { id, field, value } });
  }, [dispatch]);
  const deleteRow = (id) => dispatch({ type: 'DELETE_MISC_METAL_ROW', payload: id });
  const duplicateRow = (row) => {
    const dup = { ...row, id: crypto.randomUUID(), mark: row.mark ? `${row.mark}-copy` : '' };
    dispatch({ type: 'ADD_MISC_METAL_ROW', payload: dup });
  };
  const resetRow = (id) => {
    const fresh = emptyRow();
    Object.keys(fresh).forEach((k) => { if (k !== 'id') updateRow(id, k, fresh[k]); });
  };

  /* ─── derived calculations ─── */
  const computed = useMemo(() => {
    return rows.map((r) => {
      const totalLbs = (r.qty || 0) * (r.lengthFt || 0) * (r.lbsPerFt || 0);
      const totalTons = totalLbs / 2000;
      const fabHrsPerPc = (r.fabSetup || 0) + (r.fabCut || 0) + (r.fabDrill || 0) + (r.fabFeed || 0) + (r.fabWeld || 0) + (r.fabGrind || 0) + (r.fabPaint || 0);
      const totalFabHrs = fabHrsPerPc * (r.qty || 0);
      const instHrsPerPc = (r.instUnload || 0) + (r.instRig || 0) + (r.instFit || 0) + (r.instBolt || 0) + (r.instTouchup || 0) + (r.instQC || 0);
      const totalInstHrs = instHrsPerPc * (r.qty || 0);
      const materialCost = totalLbs * materialRate;
      const fabCost = totalFabHrs * fabRate;
      const installCost = totalInstHrs * installRate;
      const rowTotal = materialCost + fabCost + installCost;
      return { ...r, totalLbs, totalTons, fabHrsPerPc, totalFabHrs, instHrsPerPc, totalInstHrs, materialCost, fabCost, installCost, rowTotal };
    });
  }, [rows, materialRate, fabRate, installRate]);

  /* ─── sorting applied ─── */
  const sorted = useMemo(() => {
    if (!sortCol) return computed;
    return [...computed].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [computed, sortCol, sortDir]);

  /* ─── summary totals ─── */
  const totals = useMemo(() => {
    return computed.reduce(
      (acc, r) => ({
        qty: acc.qty + (r.qty || 0),
        totalLbs: acc.totalLbs + r.totalLbs,
        totalTons: acc.totalTons + r.totalTons,
        totalFabHrs: acc.totalFabHrs + r.totalFabHrs,
        totalInstHrs: acc.totalInstHrs + r.totalInstHrs,
        materialCost: acc.materialCost + r.materialCost,
        fabCost: acc.fabCost + r.fabCost,
        installCost: acc.installCost + r.installCost,
        rowTotal: acc.rowTotal + r.rowTotal,
      }),
      { qty: 0, totalLbs: 0, totalTons: 0, totalFabHrs: 0, totalInstHrs: 0, materialCost: 0, fabCost: 0, installCost: 0, rowTotal: 0 }
    );
  }, [computed]);

  /* ─── compact input ─── */
  const NumInput = ({ value, onChange, className = 'w-16' }) => (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`${className} text-xs py-1 px-1.5 border border-slate-300 rounded bg-white text-right focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none`}
    />
  );

  const TextInput = ({ value, onChange, className = 'w-20', placeholder = '' }) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} text-xs py-1 px-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none`}
    />
  );

  const ColHeader = ({ label, col, className = '' }) => (
    <th
      className={`px-2 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer select-none ${className}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortIndicator(col)}
    </th>
  );

  const Chevron = ({ group }) => (
    <button onClick={() => toggle(group)} className="mr-1 inline-flex items-center">
      {collapsed[group] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-lg bg-white shadow">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-green-500" />
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Misc Metals Takeoff</h1>
              <p className="text-sm text-slate-500">Division 05 50 00 — Metal Fabrications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Rate badges */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Fab ${fabRate}/hr
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Install ${installRate}/hr
            </span>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
            >
              <Plus size={16} /> Add Row
            </button>
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            {/* ─── Group Headers ─── */}
            <thead>
              <tr>
                {/* GROUP A — IDENTIFICATION */}
                <th colSpan={collapsed.identification ? 1 : 5} className="bg-slate-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-slate-600">
                  <Chevron group="identification" />Identification{!collapsed.identification && ` (5)`}
                </th>
                {/* GROUP B — QTY & WEIGHT */}
                <th colSpan={collapsed.qtyWeight ? 1 : 5} className="bg-purple-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-purple-600">
                  <Chevron group="qtyWeight" />Qty &amp; Weight{!collapsed.qtyWeight && ` (5)`}
                </th>
                {/* GROUP C — CONNECTIONS */}
                <th colSpan={collapsed.connections ? 1 : 2} className="bg-indigo-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-indigo-600">
                  <Chevron group="connections" />Connections{!collapsed.connections && ` (2)`}
                </th>
                {/* GROUP D — FABRICATION */}
                <th colSpan={collapsed.fabrication ? 1 : 9} className="bg-amber-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-amber-600">
                  <Chevron group="fabrication" />Fabrication{!collapsed.fabrication && ` (9)`}
                </th>
                {/* GROUP E — INSTALLATION */}
                <th colSpan={collapsed.installation ? 1 : 8} className="bg-green-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-green-600">
                  <Chevron group="installation" />Installation{!collapsed.installation && ` (8)`}
                </th>
                {/* GROUP F — COST PREVIEW */}
                <th colSpan={collapsed.costPreview ? 1 : 4} className="bg-red-700 text-white text-xs font-semibold px-2 py-1.5 text-left border-r border-red-600">
                  <Chevron group="costPreview" />Cost Preview{!collapsed.costPreview && ` (4)`}
                </th>
                {/* GROUP G — NOTES + ACTIONS */}
                <th colSpan={collapsed.notes ? 1 : 2} className="bg-slate-600 text-white text-xs font-semibold px-2 py-1.5 text-left">
                  <Chevron group="notes" />Notes{!collapsed.notes && ` + Actions`}
                </th>
              </tr>

              {/* ─── Column Sub-Headers ─── */}
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* A — IDENTIFICATION */}
                <th className="sticky left-0 z-10 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">#</th>
                {!collapsed.identification && (
                  <>
                    <th className="sticky left-8 z-10 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">Mark</th>
                    <ColHeader label="Dwg Ref" col="drawingRef" className="text-slate-600" />
                    <ColHeader label="Type" col="type" className="text-slate-600" />
                    <ColHeader label="Profile" col="profile" className="text-slate-600" />
                  </>
                )}

                {/* B — QTY & WEIGHT */}
                <ColHeader label="Qty" col="qty" className="text-slate-600" />
                {!collapsed.qtyWeight && (
                  <>
                    <ColHeader label="Length (ft)" col="lengthFt" className="text-slate-600" />
                    <ColHeader label="Wt/ft (lb)" col="lbsPerFt" className="text-slate-600" />
                    <ColHeader label="Total (lb)" col="totalLbs" className="text-slate-600" />
                    <ColHeader label="Total (ton)" col="totalTons" className="text-slate-600" />
                  </>
                )}

                {/* C — CONNECTIONS */}
                <ColHeader label="Base Pl (lb)" col="plateBP" className="text-slate-600" />
                {!collapsed.connections && (
                  <ColHeader label="Anchors/pc" col="anchorsPerPc" className="text-slate-600" />
                )}

                {/* D — FABRICATION */}
                <ColHeader label="Setup" col="fabSetup" className="text-slate-600" />
                {!collapsed.fabrication && (
                  <>
                    <ColHeader label="Cut" col="fabCut" className="text-slate-600" />
                    <ColHeader label="Drill" col="fabDrill" className="text-slate-600" />
                    <ColHeader label="Feed" col="fabFeed" className="text-slate-600" />
                    <ColHeader label="Weld" col="fabWeld" className="text-slate-600" />
                    <ColHeader label="Grind" col="fabGrind" className="text-slate-600" />
                    <ColHeader label="Paint" col="fabPaint" className="text-slate-600" />
                    <ColHeader label="Fab/Pc" col="fabHrsPerPc" className="text-slate-600" />
                    <ColHeader label="Tot Fab" col="totalFabHrs" className="text-slate-600" />
                  </>
                )}

                {/* E — INSTALLATION */}
                <ColHeader label="Unload" col="instUnload" className="text-slate-600" />
                {!collapsed.installation && (
                  <>
                    <ColHeader label="Rig" col="instRig" className="text-slate-600" />
                    <ColHeader label="Fit" col="instFit" className="text-slate-600" />
                    <ColHeader label="Bolt" col="instBolt" className="text-slate-600" />
                    <ColHeader label="Touch-up" col="instTouchup" className="text-slate-600" />
                    <ColHeader label="QC" col="instQC" className="text-slate-600" />
                    <ColHeader label="Inst/Pc" col="instHrsPerPc" className="text-slate-600" />
                    <ColHeader label="Tot Inst" col="totalInstHrs" className="text-slate-600" />
                  </>
                )}

                {/* F — COST PREVIEW */}
                <ColHeader label="Material $" col="materialCost" className="text-slate-600" />
                {!collapsed.costPreview && (
                  <>
                    <ColHeader label="Fab $" col="fabCost" className="text-slate-600" />
                    <ColHeader label="Install $" col="installCost" className="text-slate-600" />
                    <ColHeader label="Row Total" col="rowTotal" className="text-slate-600" />
                  </>
                )}

                {/* G — NOTES + ACTIONS */}
                <th className="px-2 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">Notes</th>
                {!collapsed.notes && (
                  <th className="px-2 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={34} className="px-6 py-12 text-center">
                    <Wrench className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No misc metals items yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Row" to start your takeoff</p>
                  </td>
                </tr>
              )}

              {sorted.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 group">
                  {/* A — IDENTIFICATION */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-2 py-1 text-xs text-slate-500 text-center font-mono">{idx + 1}</td>
                  {!collapsed.identification && (
                    <>
                      <td className="sticky left-8 z-10 bg-white group-hover:bg-slate-50 px-1 py-1">
                        <TextInput value={r.mark} onChange={(v) => updateRow(r.id, 'mark', v)} className="w-16" placeholder="Mk" />
                      </td>
                      <td className="px-1 py-1">
                        <TextInput value={r.drawingRef} onChange={(v) => updateRow(r.id, 'drawingRef', v)} className="w-16" placeholder="S-101" />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          value={r.type || 'Stairs'}
                          onChange={(e) => updateRow(r.id, 'type', e.target.value)}
                          className="w-24 text-xs py-1 px-1 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-purple-400 outline-none"
                        >
                          {MISC_METAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <ProfileSearch
                          value={r.profile}
                          onChange={(v) => updateRow(r.id, 'profile', v)}
                          onSelect={(shape) => {
                            updateRow(r.id, 'profile', shape.AISC_Manual_Label);
                            updateRow(r.id, 'lbsPerFt', shape.W);
                          }}
                        />
                      </td>
                    </>
                  )}

                  {/* B — QTY & WEIGHT */}
                  <td className="px-1 py-1"><NumInput value={r.qty} onChange={(v) => updateRow(r.id, 'qty', v)} /></td>
                  {!collapsed.qtyWeight && (
                    <>
                      <td className="px-1 py-1"><NumInput value={r.lengthFt} onChange={(v) => updateRow(r.id, 'lengthFt', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.lbsPerFt} onChange={(v) => updateRow(r.id, 'lbsPerFt', v)} /></td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-slate-700">{fmtNum(r.totalLbs)}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-slate-700">{fmt(r.totalTons)}</td>
                    </>
                  )}

                  {/* C — CONNECTIONS */}
                  <td className="px-1 py-1"><NumInput value={r.plateBP} onChange={(v) => updateRow(r.id, 'plateBP', v)} /></td>
                  {!collapsed.connections && (
                    <td className="px-1 py-1"><NumInput value={r.anchorsPerPc} onChange={(v) => updateRow(r.id, 'anchorsPerPc', v)} /></td>
                  )}

                  {/* D — FABRICATION */}
                  <td className="px-1 py-1"><NumInput value={r.fabSetup} onChange={(v) => updateRow(r.id, 'fabSetup', v)} /></td>
                  {!collapsed.fabrication && (
                    <>
                      <td className="px-1 py-1"><NumInput value={r.fabCut} onChange={(v) => updateRow(r.id, 'fabCut', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.fabDrill} onChange={(v) => updateRow(r.id, 'fabDrill', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.fabFeed} onChange={(v) => updateRow(r.id, 'fabFeed', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.fabWeld} onChange={(v) => updateRow(r.id, 'fabWeld', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.fabGrind} onChange={(v) => updateRow(r.id, 'fabGrind', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.fabPaint} onChange={(v) => updateRow(r.id, 'fabPaint', v)} /></td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-amber-700 font-medium">{fmt(r.fabHrsPerPc)}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-amber-700 font-medium">{fmt(r.totalFabHrs)}</td>
                    </>
                  )}

                  {/* E — INSTALLATION */}
                  <td className="px-1 py-1"><NumInput value={r.instUnload} onChange={(v) => updateRow(r.id, 'instUnload', v)} /></td>
                  {!collapsed.installation && (
                    <>
                      <td className="px-1 py-1"><NumInput value={r.instRig} onChange={(v) => updateRow(r.id, 'instRig', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.instFit} onChange={(v) => updateRow(r.id, 'instFit', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.instBolt} onChange={(v) => updateRow(r.id, 'instBolt', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.instTouchup} onChange={(v) => updateRow(r.id, 'instTouchup', v)} /></td>
                      <td className="px-1 py-1"><NumInput value={r.instQC} onChange={(v) => updateRow(r.id, 'instQC', v)} /></td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-green-700 font-medium">{fmt(r.instHrsPerPc)}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-green-700 font-medium">{fmt(r.totalInstHrs)}</td>
                    </>
                  )}

                  {/* F — COST PREVIEW */}
                  <td className="px-2 py-1 text-xs text-right font-mono text-slate-700">${fmtNum(Math.round(r.materialCost))}</td>
                  {!collapsed.costPreview && (
                    <>
                      <td className="px-2 py-1 text-xs text-right font-mono text-amber-700">${fmtNum(Math.round(r.fabCost))}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-green-700">${fmtNum(Math.round(r.installCost))}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono font-bold text-slate-800">${fmtNum(Math.round(r.rowTotal))}</td>
                    </>
                  )}

                  {/* G — NOTES + ACTIONS */}
                  <td className="px-1 py-1">
                    <TextInput value={r.notes} onChange={(v) => updateRow(r.id, 'notes', v)} className="w-28" placeholder="Notes..." />
                  </td>
                  {!collapsed.notes && (
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => duplicateRow(r)} className="p-1 rounded hover:bg-purple-100 text-slate-400 hover:text-purple-600 transition" title="Duplicate">
                          <Copy size={13} />
                        </button>
                        <button onClick={() => resetRow(r.id)} className="p-1 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition" title="Reset">
                          <RotateCcw size={13} />
                        </button>
                        <button onClick={() => deleteRow(r.id)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* ─── Summary Totals Row ─── */}
              {sorted.length > 0 && (
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-100 px-2 py-2 text-xs text-slate-600" />
                  {!collapsed.identification && (
                    <>
                      <td className="sticky left-8 z-10 bg-slate-100 px-2 py-2 text-xs text-slate-700">TOTALS</td>
                      <td /><td /><td />
                    </>
                  )}

                  <td className="px-2 py-2 text-xs text-right font-mono">{fmtNum(totals.qty)}</td>
                  {!collapsed.qtyWeight && (
                    <>
                      <td /><td />
                      <td className="px-2 py-2 text-xs text-right font-mono">{fmtNum(Math.round(totals.totalLbs))}</td>
                      <td className="px-2 py-2 text-xs text-right font-mono">{fmt(totals.totalTons)}</td>
                    </>
                  )}

                  <td />
                  {!collapsed.connections && <td />}

                  <td />
                  {!collapsed.fabrication && (
                    <>
                      <td /><td /><td /><td /><td /><td /><td />
                      <td className="px-2 py-2 text-xs text-right font-mono text-amber-700">{fmt(totals.totalFabHrs)}</td>
                    </>
                  )}

                  <td />
                  {!collapsed.installation && (
                    <>
                      <td /><td /><td /><td /><td /><td />
                      <td className="px-2 py-2 text-xs text-right font-mono text-green-700">{fmt(totals.totalInstHrs)}</td>
                    </>
                  )}

                  <td className="px-2 py-2 text-xs text-right font-mono">${fmtNum(Math.round(totals.materialCost))}</td>
                  {!collapsed.costPreview && (
                    <>
                      <td className="px-2 py-2 text-xs text-right font-mono text-amber-700">${fmtNum(Math.round(totals.fabCost))}</td>
                      <td className="px-2 py-2 text-xs text-right font-mono text-green-700">${fmtNum(Math.round(totals.installCost))}</td>
                      <td className="px-2 py-2 text-xs text-right font-mono font-bold">${fmtNum(Math.round(totals.rowTotal))}</td>
                    </>
                  )}

                  <td />
                  {!collapsed.notes && <td />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Bottom Summary Cards ─── */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Pieces */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-purple-500">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Pieces</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{fmtNum(totals.qty)}</p>
          </div>
          {/* Weight */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-purple-500">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Weight</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{fmt(totals.totalTons)} <span className="text-sm font-normal">tons</span></p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtNum(Math.round(totals.totalLbs))} lbs</p>
          </div>
          {/* Fabrication */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-amber-500">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Fabrication</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(totals.totalFabHrs)} <span className="text-sm font-normal">hrs</span></p>
            <p className="text-xs text-slate-400 mt-0.5">${fmtNum(Math.round(totals.fabCost))}</p>
          </div>
          {/* Installation */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Installation</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{fmt(totals.totalInstHrs)} <span className="text-sm font-normal">hrs</span></p>
            <p className="text-xs text-slate-400 mt-0.5">${fmtNum(Math.round(totals.installCost))}</p>
          </div>
          {/* Grand Total */}
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-red-500">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Grand Total</p>
            <p className="text-2xl font-bold text-red-700 mt-1">${fmtNum(Math.round(totals.rowTotal))}</p>
            <p className="text-xs text-slate-400 mt-0.5">Material ${fmtNum(Math.round(totals.materialCost))}</p>
          </div>
        </div>
      )}
    </div>
  );
}
