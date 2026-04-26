import { useState, useMemo } from 'react';
import { Grid3X3, Plus, Trash2, Copy, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

const REINF_METHODS = [
  '2 Bars Top + Plate Bottom',
  '2 Bars Top + 2 Bars Bottom',
  'Angle + Plate',
  'Channel Reinforcement',
  'HSS Strongback',
  'Bolted Splice',
  'Welded Splice',
  'Full Replacement',
  'Custom',
];
/* ---- SJI Joist Types ---- */
const K_SERIES = [
  '8K1','10K1','12K1','12K3','12K5',
  '14K1','14K3','14K4','14K6',
  '16K2','16K3','16K4','16K5','16K6','16K7','16K9',
  '18K3','18K4','18K5','18K6','18K7','18K9','18K10',
  '20K3','20K4','20K5','20K6','20K7','20K9','20K10',
  '22K4','22K5','22K6','22K7','22K9','22K10','22K11',
  '24K4','24K5','24K6','24K7','24K8','24K9','24K10','24K12',
  '26K5','26K6','26K7','26K8','26K9','26K10','26K12',
  '28K6','28K7','28K8','28K9','28K10','28K12',
  '30K7','30K8','30K9','30K10','30K11','30K12',
];
const LH_SERIES = [
  '18LH02','18LH03','18LH04','18LH05','18LH06','18LH07','18LH08','18LH09',
  '20LH02','20LH03','20LH04','20LH05','20LH06','20LH07','20LH08','20LH09','20LH10',
  '24LH03','24LH04','24LH05','24LH06','24LH07','24LH08','24LH09','24LH10','24LH11',
  '28LH05','28LH06','28LH07','28LH08','28LH09','28LH10','28LH11','28LH12','28LH13',
  '32LH06','32LH07','32LH08','32LH09','32LH10','32LH11','32LH12','32LH13','32LH14','32LH15',
  '36LH07','36LH08','36LH09','36LH10','36LH11','36LH12','36LH13','36LH14','36LH15',
  '40LH08','40LH09','40LH10','40LH11','40LH12','40LH13','40LH14','40LH15','40LH16',
  '44LH09','44LH10','44LH11','44LH12','44LH13','44LH14','44LH15','44LH16','44LH17',
  '48LH10','48LH11','48LH12','48LH13','48LH14','48LH15','48LH16','48LH17',
];
const DLH_SERIES = [
  '52DLH10','52DLH11','52DLH12','52DLH13','52DLH14','52DLH15','52DLH16','52DLH17','52DLH18',
  '56DLH11','56DLH12','56DLH13','56DLH14','56DLH15','56DLH16','56DLH17','56DLH18','56DLH19',
  '60DLH12','60DLH13','60DLH14','60DLH15','60DLH16','60DLH17','60DLH18',
  '64DLH13','64DLH14','64DLH15','64DLH16','64DLH17','64DLH18',
  '68DLH14','68DLH15','68DLH16','68DLH17','68DLH18','68DLH19',
  '72DLH14','72DLH15','72DLH16','72DLH17','72DLH18','72DLH19',
];

const MATERIAL_RATE = 4.25;
const FAB_RATE = 95;
const INSTALL_RATE = 110;

const defaultRow = () => ({
  id: crypto.randomUUID(),
  mark: '',
  location: '',
  joistType: '18K3',
  span: 0,
  reinfMethod: '2 Bars Top + Plate Bottom',
  qty: 1,
  weightLbs: 0,
  fabHrs: 0,
  instHrs: 0,
  notes: '',
});

/* ---- Info Legend Component ---- */
function JoistInfoLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <Info className="h-4 w-4" />
          Reference Guide: Joist Types & Reinforcement Methods
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
      </button>
      {open && (
        <div className="border-t border-blue-200 px-5 py-4 text-xs leading-relaxed text-steel-700">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-bold text-steel-800">SJI Joist Type Nomenclature</h4>
              <p className="mb-2">Format: <span className="font-mono font-bold">[Depth]</span><span className="font-mono font-bold text-fire-600">[Series]</span><span className="font-mono font-bold text-blue-600">[Chord #]</span></p>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-blue-200 text-left"><th className="py-1 font-semibold">Series</th><th className="py-1 font-semibold">Name</th><th className="py-1 font-semibold">Depth</th><th className="py-1 font-semibold">Typical Span</th></tr></thead>
                <tbody className="divide-y divide-blue-100">
                  <tr><td className="py-1 font-mono font-bold text-fire-600">K</td><td>Standard</td><td>8" - 30"</td><td>8 - 60 ft</td></tr>
                  <tr><td className="py-1 font-mono font-bold text-fire-600">LH</td><td>Long Span</td><td>18" - 48"</td><td>25 - 96 ft</td></tr>
                  <tr><td className="py-1 font-mono font-bold text-fire-600">DLH</td><td>Deep Long Span</td><td>52" - 72"</td><td>60 - 144 ft</td></tr>
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-silver-500"><span className="font-semibold">Chord #</span> = size of top/bottom chords. Higher number = heavier chords = more load capacity.</p>
              <p className="mt-1 text-[11px] text-silver-500">Example: <span className="font-mono font-bold">24K8</span> = 24" deep, K-series, chord size 8 (medium-heavy, ~30-45 ft spans).</p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold text-steel-800">Reinforcement Methods</h4>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-blue-200 text-left"><th className="py-1 font-semibold">Method</th><th className="py-1 font-semibold">Description</th></tr></thead>
                <tbody className="divide-y divide-blue-100">
                  <tr><td className="py-1.5 font-semibold text-fire-600">2 Bars Top + Plate Bot</td><td>Two round bars welded to top chord + steel plate welded to bottom chord. Most common method.</td></tr>
                  <tr><td className="py-1.5 font-semibold text-fire-600">2 Bars Top + 2 Bars Bot</td><td>Two round bars on each chord (top and bottom). Used when both chords need reinforcement.</td></tr>
                  <tr><td className="py-1.5 font-semibold">Angle + Plate</td><td>Steel angle on top chord + plate on bottom. Traditional method for moderate loads.</td></tr>
                  <tr><td className="py-1.5 font-semibold">Channel Reinf.</td><td>C-channel sistered alongside joist chords. Good for heavier load increases.</td></tr>
                  <tr><td className="py-1.5 font-semibold">HSS Strongback</td><td>HSS tube bolted/welded alongside joist. For significant load upgrades or point loads.</td></tr>
                  <tr><td className="py-1.5 font-semibold">Bolted Splice</td><td>Bolted connection to repair damaged chord sections.</td></tr>
                  <tr><td className="py-1.5 font-semibold">Welded Splice</td><td>Welded repair of cracked or damaged chord members.</td></tr>
                  <tr><td className="py-1.5 font-semibold">Full Replacement</td><td>Complete joist replacement when reinforcement is not viable.</td></tr>
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-silver-500">Standards: SJI Technical Digest #2 (Reinforcement), CSA S16-19. All reinforcement designs require PE stamp.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JoistReinf() {
  const { state, dispatch } = useProject();
  const rows = state.joistReinf || [];

  const addRow = () => dispatch({ type: 'ADD_JOIST_REINF_ROW', payload: defaultRow() });

  const duplicateRow = (row) =>
    dispatch({ type: 'ADD_JOIST_REINF_ROW', payload: { ...row, id: crypto.randomUUID(), mark: row.mark + ' (copy)' } });

  const updateRow = (id, field, value) =>
    dispatch({ type: 'UPDATE_JOIST_REINF_ROW', payload: { id, [field]: value } });

  const deleteRow = (id) => dispatch({ type: 'DELETE_JOIST_REINF_ROW', payload: id });

  const summary = useMemo(() => {
    const totalWeight = rows.reduce((s, r) => s + Number(r.weightLbs || 0) * Number(r.qty || 1), 0);
    return {
      totalItems: rows.length,
      totalQty: rows.reduce((s, r) => s + Number(r.qty || 0), 0),
      totalWeight,
      totalTons: totalWeight / 2000,
      fabHours: rows.reduce((s, r) => s + Number(r.fabHrs || 0), 0),
      instHours: rows.reduce((s, r) => s + Number(r.instHrs || 0), 0),
    };
  }, [rows]);

  const costs = useMemo(() => {
    const mat = summary.totalWeight * MATERIAL_RATE;
    const fab = summary.fabHours * FAB_RATE;
    const inst = summary.instHours * INSTALL_RATE;
    return { mat, fab, inst, total: mat + fab + inst };
  }, [summary]);

  const inputCls =
    'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-fire-500 rounded';
  const inputTextCls =
    'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-fire-500 rounded';
  const selectCls =
    'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-fire-500 rounded cursor-pointer';

  return (
    <div className="min-h-screen bg-steel-50">
      {/* Accent stripe */}
      <div className="accent-stripe h-1.5 bg-gradient-to-r from-fire-500 via-fire-600 to-steel-800" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="page-title flex items-center gap-3 text-3xl font-bold text-steel-800">
            <Grid3X3 className="h-8 w-8 text-fire-600" />
            Joist Reinforcement
          </div>
          <p className="page-subtitle mt-1 text-sm text-silver-500">
            Open web steel joist reinforcement &mdash; bar, angle, plate &amp; channel methods
          </p>
        </div>

        {/* Info Legend */}
        <JoistInfoLegend />

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Items', value: fmtNum(summary.totalItems) },
            { label: 'Total Qty', value: fmtNum(summary.totalQty) },
            { label: 'Total Weight (lbs)', value: fmtNum(summary.totalWeight) },
            { label: 'Total Weight (tons)', value: fmtNum(summary.totalTons, 2) },
            { label: 'Fab Hours', value: fmtNum(summary.fabHours, 1) },
            { label: 'Install Hours', value: fmtNum(summary.instHours, 1) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-silver-500">{c.label}</p>
              <p className="mt-1 text-xl font-bold text-steel-800">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Add row button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-steel-700">Reinforcement Schedule</h2>
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600 focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
        </div>

        {/* Table */}
        {rows.length > 0 ? (
          <div className="rounded-xl border border-silver-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 text-center font-semibold w-10">#</th>
                  <th className="px-3 py-3 text-left font-semibold">Mark</th>
                  <th className="px-3 py-3 text-left font-semibold">Location</th>
                  <th className="px-3 py-3 text-left font-semibold">Joist Type</th>
                  <th className="px-3 py-3 text-right font-semibold">Span (ft)</th>
                  <th className="px-3 py-3 text-left font-semibold">Reinf. Method</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold">Weight (lbs)</th>
                  <th className="px-3 py-3 text-right font-semibold">Fab Hrs</th>
                  <th className="px-3 py-3 text-right font-semibold">Install Hrs</th>
                  <th className="px-3 py-3 text-left font-semibold">Notes</th>
                  <th className="px-3 py-3 text-center font-semibold w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="even:bg-steel-50 hover:bg-fire-50/30 transition-colors">
                    <td className="px-3 py-2 text-center text-xs font-mono text-silver-400">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.mark}
                        onChange={(e) => updateRow(row.id, 'mark', e.target.value)}
                        placeholder="e.g. JR-01"
                        className={inputTextCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                        placeholder="e.g. Grid B-3"
                        className={inputTextCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.joistType}
                        onChange={(e) => updateRow(row.id, 'joistType', e.target.value)}
                        className={selectCls}
                      >
                        <optgroup label="K-Series (Standard)">
                          {K_SERIES.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </optgroup>
                        <optgroup label="LH-Series (Long Span)">
                          {LH_SERIES.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </optgroup>
                        <optgroup label="DLH-Series (Deep Long Span)">
                          {DLH_SERIES.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </optgroup>
                        <optgroup label="Other">
                          <option value="KCS">KCS (Constant Depth)</option>
                          <option value="CJ">CJ (Composite)</option>
                          <option value="Custom">Custom</option>
                        </optgroup>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.span || ''}
                        onChange={(e) => updateRow(row.id, 'span', parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.reinfMethod}
                        onChange={(e) => updateRow(row.id, 'reinfMethod', e.target.value)}
                        className={selectCls}
                      >
                        {REINF_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="1"
                        value={row.qty || ''}
                        onChange={(e) => updateRow(row.id, 'qty', parseInt(e.target.value) || 1)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        value={row.weightLbs || ''}
                        onChange={(e) => updateRow(row.id, 'weightLbs', parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.fabHrs || ''}
                        onChange={(e) => updateRow(row.id, 'fabHrs', parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.instHrs || ''}
                        onChange={(e) => updateRow(row.id, 'instHrs', parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                        placeholder="—"
                        className={inputTextCls}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => duplicateRow(row)}
                          title="Duplicate row"
                          className="rounded p-1 text-silver-400 transition hover:bg-steel-100 hover:text-steel-600"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRow(row.id)}
                          title="Delete row"
                          className="rounded p-1 text-silver-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty state */
          <div className="rounded-xl border border-dashed border-silver-300 bg-white p-12 text-center shadow-sm">
            <Grid3X3 className="mx-auto h-12 w-12 text-silver-300" />
            <h3 className="mt-4 text-lg font-semibold text-steel-700">No joist reinforcements yet</h3>
            <p className="mt-1 text-sm text-silver-400">
              Click <span className="font-semibold text-fire-600">"Add Row"</span> to begin your reinforcement schedule.
            </p>
          </div>
        )}

        {/* Cost preview */}
        {rows.length > 0 && (
          <div className="mt-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-steel-700">Cost Preview</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-silver-500">Material Cost</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmt(costs.mat)}</p>
                <p className="text-[10px] text-silver-400">{fmtNum(summary.totalWeight)} lbs &times; {fmt(MATERIAL_RATE)}/lb</p>
              </div>
              <div>
                <p className="text-xs text-silver-500">Fabrication Cost</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmt(costs.fab)}</p>
                <p className="text-[10px] text-silver-400">{fmtNum(summary.fabHours, 1)} hrs &times; {fmt(FAB_RATE)}/hr</p>
              </div>
              <div>
                <p className="text-xs text-silver-500">Install Cost</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmt(costs.inst)}</p>
                <p className="text-[10px] text-silver-400">{fmtNum(summary.instHours, 1)} hrs &times; {fmt(INSTALL_RATE)}/hr</p>
              </div>
              <div className="rounded-lg bg-steel-800 p-3">
                <p className="text-xs text-silver-300">Total Estimated</p>
                <p className="mt-0.5 text-lg font-bold text-fire-400">{fmt(costs.total)}</p>
                <p className="text-[10px] text-silver-400">material + fab + install</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-silver-200 pt-6 text-center">
          <p className="text-xs text-silver-400">
            Triple Weld Inc. &mdash; Steel Estimating Suite &mdash; Joist Reinforcement Module
          </p>
        </footer>
      </div>
    </div>
  );
}
