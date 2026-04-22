import { useState, useMemo } from 'react';
import { SquareSlash, Plus, Trash2, Copy } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

const LADDER_TYPES = ['Fixed Ladder', 'Ship Ladder', 'Access Ladder', 'Roof Hatch Ladder'];
const MATERIALS = ['Structural steel', 'Galvanized steel', 'Stainless steel'];

const MATERIAL_RATE = 4.25;
const FAB_RATE = 95;
const INSTALL_RATE = 110;

const defaultRow = () => ({
  id: crypto.randomUUID(),
  location: '',
  type: 'Fixed Ladder',
  heightFt: 0,
  hasCage: false,
  material: 'Structural steel',
  weightLbs: 0,
  fabHrs: 0,
  instHrs: 0,
  notes: '',
});

export default function Ladder() {
  const { state, dispatch } = useProject();
  const rows = state.ladderRows || [];

  const addRow = () => dispatch({ type: 'ADD_LADDER_ROW', payload: defaultRow() });

  const duplicateRow = (row) =>
    dispatch({ type: 'ADD_LADDER_ROW', payload: { ...row, id: crypto.randomUUID(), location: row.location + ' (copy)' } });

  const updateRow = (id, field, value) =>
    dispatch({ type: 'UPDATE_LADDER_ROW', payload: { id, [field]: value } });

  const deleteRow = (id) => dispatch({ type: 'DELETE_LADDER_ROW', payload: id });

  const summary = useMemo(() => {
    const totalWeight = rows.reduce((s, r) => s + Number(r.weightLbs || 0), 0);
    return {
      totalItems: rows.length,
      totalWeight,
      totalTons: totalWeight / 2000,
      fabHours: rows.reduce((s, r) => s + Number(r.fabHrs || 0), 0),
      instHours: rows.reduce((s, r) => s + Number(r.instHrs || 0), 0),
      withCage: rows.filter((r) => r.hasCage).length,
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
            <SquareSlash className="h-8 w-8 text-fire-600" />
            Ladder Takeoff
          </div>
          <p className="page-subtitle mt-1 text-sm text-silver-500">
            Fixed ladders, ship ladders &amp; access systems — OHSA compliant
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Items', value: fmtNum(summary.totalItems) },
            { label: 'Total Weight (lbs)', value: fmtNum(summary.totalWeight) },
            { label: 'Total Weight (tons)', value: fmtNum(summary.totalTons, 2) },
            { label: 'Fab Hours', value: fmtNum(summary.fabHours, 1) },
            { label: 'Install Hours', value: fmtNum(summary.instHours, 1) },
            { label: 'Items w/ Cage', value: fmtNum(summary.withCage) },
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
          <h2 className="text-lg font-semibold text-steel-700">Ladder Schedule</h2>
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
                  <th className="px-3 py-3 text-left font-semibold">Location</th>
                  <th className="px-3 py-3 text-left font-semibold">Type</th>
                  <th className="px-3 py-3 text-right font-semibold">Height (ft)</th>
                  <th className="px-3 py-3 text-center font-semibold">Cage?</th>
                  <th className="px-3 py-3 text-left font-semibold">Material</th>
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
                        value={row.location}
                        onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                        placeholder="e.g. Roof access"
                        className={inputTextCls}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(row.id, 'type', e.target.value)}
                        className={selectCls}
                      >
                        {LADDER_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.heightFt || ''}
                        onChange={(e) => updateRow(row.id, 'heightFt', parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.hasCage}
                        onChange={(e) => updateRow(row.id, 'hasCage', e.target.checked)}
                        className="h-4 w-4 rounded border-silver-300 text-fire-600 focus:ring-fire-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.material}
                        onChange={(e) => updateRow(row.id, 'material', e.target.value)}
                        className={selectCls}
                      >
                        {MATERIALS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
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
            <SquareSlash className="mx-auto h-12 w-12 text-silver-300" />
            <h3 className="mt-4 text-lg font-semibold text-steel-700">No ladders yet</h3>
            <p className="mt-1 text-sm text-silver-400">
              Click <span className="font-semibold text-fire-600">"Add Row"</span> to begin your ladder takeoff.
            </p>
          </div>
        )}

        {/* OHSA note */}
        {rows.length > 0 && (
          <div className="mt-4 rounded-lg border border-fire-200 bg-fire-50 px-4 py-3">
            <p className="text-xs font-medium text-fire-700">
              <span className="font-bold">OHSA Note:</span> OHSA requires cage protection for fixed ladders exceeding 6&thinsp;m (20&thinsp;ft) in height.
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
            Triple Weld Inc. &mdash; Steel Estimating Suite &mdash; Ladder Takeoff Module
          </p>
        </footer>
      </div>
    </div>
  );
}
