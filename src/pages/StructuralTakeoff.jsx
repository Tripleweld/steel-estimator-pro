import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { searchShapes } from '../data/aisc-shapes';
import {
  Plus,
  Trash2,
  Search,
  HardHat,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Copy,
  ArrowUpDown,
} from 'lucide-react';

const TYPE_OPTIONS = [
  'Beam',
  'Column',
  'Brace',
  'Plate',
  'HSS',
  'Angle',
  'Channel',
  'Other',
];

const fmt = (v) =>
  '$' +
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtNum = (v, decimals = 0) =>
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// ---------------------------------------------------------------------------
// Column group definitions
// ---------------------------------------------------------------------------
const COLUMN_GROUPS = [
  { label: 'Identification', cols: 5, bg: 'bg-slate-700 text-white' },
  { label: 'Quantity & Weight', cols: 5, bg: 'bg-blue-700 text-white' },
  { label: 'Connections & Hardware', cols: 2, bg: 'bg-purple-700 text-white' },
  { label: 'Fabrication Hours (per piece)', cols: 9, bg: 'bg-amber-700 text-white' },
  { label: 'Installation Hours (per piece)', cols: 8, bg: 'bg-green-700 text-white' },
  { label: 'Cost Preview', cols: 4, bg: 'bg-red-700 text-white' },
  { label: 'Notes', cols: 1, bg: 'bg-slate-600 text-white' },
  { label: '', cols: 1, bg: 'bg-slate-800' }, // actions column
];

// ---------------------------------------------------------------------------
// Profile / AISC shape search dropdown
// ---------------------------------------------------------------------------
function ProfileSearch({ value, lbsPerFt, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => {
        const matches = searchShapes(val);
        setResults(matches.slice(0, 15));
        setOpen(matches.length > 0);
      }, 250);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const handleSelect = (shape) => {
    setQuery(shape.name);
    setOpen(false);
    onChange({ profile: shape.name, lbsPerFt: shape.W });
  };

  const handleBlur = () => {
    // allow click on dropdown item before closing
    setTimeout(() => setOpen(false), 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onBlur={handleBlur}
          placeholder="Search..."
          className="input-number text-xs py-1 w-28"
        />
        <Search size={12} className="text-gray-400 shrink-0" />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-56 max-h-48 overflow-y-auto rounded border border-gray-600 bg-gray-800 shadow-lg text-xs">
          {results.map((shape) => (
            <li
              key={shape.name}
              onMouseDown={() => handleSelect(shape)}
              className="px-2 py-1.5 cursor-pointer hover:bg-blue-600 hover:text-white flex justify-between"
            >
              <span className="font-medium">{shape.name}</span>
              <span className="text-gray-400">{shape.W} lb/ft</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StructuralTakeoff() {
  const { state, dispatch } = useProject();
  const rows = state.structural || [];
  const rates = state.rates || {};

  const fabRate = rates.labourRates?.fabRate || 0;
  const installRate = rates.labourRates?.installRate || 0;

  // Resolve material rate ($/lb) â try to match by type, else first entry
  const getMaterialRate = useCallback(
    (type) => {
      const mats = rates.materialRates || [];
      if (!mats.length) return 0;
      const match = mats.find(
        (r) => r.item && type && r.item.toLowerCase().includes(type.toLowerCase())
      );
      return match ? Number(match.rate || match.costPerLb || 0) : Number(mats[0].rate || mats[0].costPerLb || 0);
    },
    [rates.materialRates]
  );

  // ------ Row-level derived data ------
  const computedRows = useMemo(() => {
    return rows.map((row, idx) => {
      const qty = Number(row.qty) || 0;
      const lengthFt = Number(row.lengthFt) || 0;
      const lbsPerFt = Number(row.lbsPerFt) || 0;

      const totalLbs = qty * lengthFt * lbsPerFt;
      const totalTons = totalLbs / 2000;

      // Fab hours per piece
      const fabFields = [
        row.fabSetup, row.fabCut, row.fabDrill, row.fabFeed,
        row.fabWeld, row.fabGrind, row.fabPaint,
      ];
      const fabHrsPerPc = fabFields.reduce((s, v) => s + (Number(v) || 0), 0);
      const totalFabHrs = fabHrsPerPc * qty;

      // Install hours per piece
      const instFields = [
        row.instUnload, row.instRig, row.instFit,
        row.instBolt, row.instTouchup, row.instQC,
      ];
      const instHrsPerPc = instFields.reduce((s, v) => s + (Number(v) || 0), 0);
      const totalInstHrs = instHrsPerPc * qty;

      // Costs
      const matRate = getMaterialRate(row.type);
      const materialCost = totalLbs * matRate;
      const fabCost = totalFabHrs * fabRate;
      const installCost = totalInstHrs * installRate;
      const rowTotal = materialCost + fabCost + installCost;

      return {
        ...row,
        _idx: idx + 1,
        totalLbs,
        totalTons,
        fabHrsPerPc,
        totalFabHrs,
        instHrsPerPc,
        totalInstHrs,
        materialCost,
        fabCost,
        installCost,
        rowTotal,
      };
    });
  }, [rows, fabRate, installRate, getMaterialRate]);

  // ------ Summary totals ------
  const summary = useMemo(() => {
    return computedRows.reduce(
      (acc, r) => ({
        totalPieces: acc.totalPieces + (Number(r.qty) || 0),
        totalLbs: acc.totalLbs + r.totalLbs,
        totalTons: acc.totalTons + r.totalTons,
        totalFabHrs: acc.totalFabHrs + r.totalFabHrs,
        totalInstHrs: acc.totalInstHrs + r.totalInstHrs,
        materialCost: acc.materialCost + r.materialCost,
        fabCost: acc.fabCost + r.fabCost,
        installCost: acc.installCost + r.installCost,
        grandTotal: acc.grandTotal + r.rowTotal,
      }),
      {
        totalPieces: 0,
        totalLbs: 0,
        totalTons: 0,
        totalFabHrs: 0,
        totalInstHrs: 0,
        materialCost: 0,
        fabCost: 0,
        installCost: 0,
        grandTotal: 0,
      }
    );
  }, [computedRows]);

  // ------ Handlers ------
  const addRow = () => dispatch({ type: 'ADD_STRUCTURAL_ROW' });

  const updateRow = useCallback(
    (id, fields) =>
      dispatch({ type: 'UPDATE_STRUCTURAL_ROW', payload: { id, ...fields } }),
    [dispatch]
  );

  const deleteRow = useCallback(
    (id) => dispatch({ type: 'DELETE_STRUCTURAL_ROW', payload: id }),
    [dispatch]
  );

  const duplicateRow = useCallback(
    (row) => {
      const cloned = {
        ...row,
        id: Date.now(),
        mark: row.mark ? row.mark + ' (copy)' : '',
      };
      // Remove computed fields
      delete cloned._idx;
      delete cloned.totalLbs;
      delete cloned.totalTons;
      delete cloned.fabHrsPerPc;
      delete cloned.totalFabHrs;
      delete cloned.instHrsPerPc;
      delete cloned.totalInstHrs;
      delete cloned.materialCost;
      delete cloned.fabCost;
      delete cloned.installCost;
      delete cloned.rowTotal;

      dispatch({
        type: 'SET_STRUCTURAL',
        payload: [...rows, cloned],
      });
    },
    [dispatch, rows]
  );

  // ------ Sorting ------
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortField) return computedRows;
    return [...computedRows].sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [computedRows, sortField, sortDir]);

  // ------ Collapsed groups ------
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (label) =>
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  // ------ Render helpers ------
  const numInput = (row, field, width = 'w-16') => (
    <input
      type="number"
      step="any"
      value={row[field] ?? ''}
      onChange={(e) => updateRow(row.id, { [field]: e.target.value })}
      className={`input-number text-xs py-1 ${width}`}
    />
  );

  const readonlyCell = (value, decimals = 0) => (
    <span className="text-xs tabular-nums text-gray-300">
      {fmtNum(value, decimals)}
    </span>
  );

  const currencyCell = (value) => (
    <span className="text-xs tabular-nums text-gray-300 font-medium">
      {fmt(value)}
    </span>
  );

  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-4">
      {/* Accent stripe */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 rounded-full" />

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <HardHat className="text-amber-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Structural Steel Takeoff
            </h1>
            <p className="text-sm text-gray-300">
              Division 05 12 00 &mdash; Structural Steel Framing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
          >
            <Plus size={14} />
            Add Row
          </button>
          <button
            onClick={() => {
              setSortField(null);
              setSortDir('asc');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
            title="Reset sort"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Rate info badges */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-1 rounded bg-amber-900/70 text-amber-200 border border-amber-600">
          Fab Rate: {fmt(fabRate)}/hr
        </span>
        <span className="px-2 py-1 rounded bg-green-900/70 text-green-200 border border-green-600">
          Install Rate: {fmt(installRate)}/hr
        </span>
        <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 border border-gray-500">
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/90">
        <table className="min-w-max w-full border-collapse text-sm">
          {/* ---- Group header row ---- */}
          <thead>
            <tr>
              {COLUMN_GROUPS.map((g, gi) => (
                <th
                  key={gi}
                  colSpan={g.cols}
                  className={`${g.bg} px-2 py-1.5 text-xs font-semibold text-center border-b border-gray-600 ${
                    g.label ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={() => g.label && toggleGroup(g.label)}
                >
                  {g.label && (
                    <span className="inline-flex items-center gap-1">
                      {collapsedGroups[g.label] ? (
                        <ChevronRight size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      {g.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>

            {/* ---- Column headers ---- */}
            <tr className="bg-gray-800">
              {/* GROUP A â Identification */}
              <th className="table-header text-xs whitespace-nowrap sticky left-0 z-20 bg-gray-800">#</th>
              <th className="table-header text-xs whitespace-nowrap sticky left-8 z-20 bg-gray-800">Mark</th>
              <th className="table-header text-xs whitespace-nowrap">Dwg Ref</th>
              <th className="table-header text-xs whitespace-nowrap">Type</th>
              <th className="table-header text-xs whitespace-nowrap">Profile</th>

              {/* GROUP B â Qty & Weight */}
              <th className="table-header text-xs whitespace-nowrap">Qty</th>
              <th className="table-header text-xs whitespace-nowrap">Length (ft)</th>
              <th className="table-header text-xs whitespace-nowrap">Wt/ft (lb)</th>
              <th className="table-header text-xs whitespace-nowrap">Total (lb)</th>
              <th className="table-header text-xs whitespace-nowrap">Total (ton)</th>

              {/* GROUP C â Connections */}
              <th className="table-header text-xs whitespace-nowrap">Base Pl (lb)</th>
              <th className="table-header text-xs whitespace-nowrap">Anchors/pc</th>

              {/* GROUP D â Fabrication */}
              <th className="table-header text-xs whitespace-nowrap">Setup</th>
              <th className="table-header text-xs whitespace-nowrap">Cut</th>
              <th className="table-header text-xs whitespace-nowrap">Drill</th>
              <th className="table-header text-xs whitespace-nowrap">Feed</th>
              <th className="table-header text-xs whitespace-nowrap">Weld</th>
              <th className="table-header text-xs whitespace-nowrap">Grind</th>
              <th className="table-header text-xs whitespace-nowrap">Paint</th>
              <th className="table-header text-xs whitespace-nowrap">Fab/Pc</th>
              <th className="table-header text-xs whitespace-nowrap">Tot Fab</th>

              {/* GROUP E â Installation */}
              <th className="table-header text-xs whitespace-nowrap">Unload</th>
              <th className="table-header text-xs whitespace-nowrap">Rig</th>
              <th className="table-header text-xs whitespace-nowrap">Fit</th>
              <th className="table-header text-xs whitespace-nowrap">Bolt</th>
              <th className="table-header text-xs whitespace-nowrap">Touch-up</th>
              <th className="table-header text-xs whitespace-nowrap">QC</th>
              <th className="table-header text-xs whitespace-nowrap">Inst/Pc</th>
              <th className="table-header text-xs whitespace-nowrap">Tot Inst</th>

              {/* GROUP F â Cost */}
              <th className="table-header text-xs whitespace-nowrap">Material $</th>
              <th className="table-header text-xs whitespace-nowrap">Fab $</th>
              <th className="table-header text-xs whitespace-nowrap">Install $</th>
              <th className="table-header text-xs whitespace-nowrap">Row Total</th>

              {/* Notes */}
              <th className="table-header text-xs whitespace-nowrap">Notes</th>

              {/* Actions */}
              <th className="table-header text-xs whitespace-nowrap w-16"></th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={35} className="text-center py-12 text-gray-400 text-sm">
                  No rows yet. Click <strong>Add Row</strong> to begin your takeoff.
                </td>
              </tr>
            )}

            {sortedRows.map((row) => (
              <tr key={row.id} className="table-row hover:bg-gray-800/60 border-b border-gray-800">
                {/* ---- A: Identification ---- */}
                <td className="table-cell text-xs text-center text-gray-300 sticky left-0 z-10 bg-gray-900">
                  {row._idx}
                </td>
                <td className="table-cell sticky left-8 z-10 bg-gray-900">
                  <input
                    type="text"
                    value={row.mark || ''}
                    onChange={(e) => updateRow(row.id, { mark: e.target.value })}
                    className="input-number text-xs py-1 w-20 font-medium"
                    placeholder="B1"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={row.drawingRef || ''}
                    onChange={(e) => updateRow(row.id, { drawingRef: e.target.value })}
                    className="input-number text-xs py-1 w-20"
                    placeholder="S-101"
                  />
                </td>
                <td className="table-cell">
                  <select
                    value={row.type || ''}
                    onChange={(e) => updateRow(row.id, { type: e.target.value })}
                    className="input-number text-xs py-1 w-24 bg-gray-800 border border-blue-500/30 rounded text-white"
                  >
                    <option value="">--</option>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="table-cell">
                  <ProfileSearch
                    value={row.profile}
                    lbsPerFt={row.lbsPerFt}
                    onChange={(fields) => updateRow(row.id, fields)}
                  />
                </td>

                {/* ---- B: Qty & Weight ---- */}
                <td className="table-cell">{numInput(row, 'qty')}</td>
                <td className="table-cell">{numInput(row, 'lengthFt')}</td>
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-blue-200 font-semibold">
                    {row.lbsPerFt ? fmtNum(row.lbsPerFt, 1) : '--'}
                  </span>
                </td>
                <td className="table-cell text-center">{readonlyCell(row.totalLbs)}</td>
                <td className="table-cell text-center">{readonlyCell(row.totalTons, 2)}</td>

                {/* ---- C: Connections ---- */}
                <td className="table-cell">{numInput(row, 'plateBP')}</td>
                <td className="table-cell">{numInput(row, 'anchorsPerPc')}</td>

                {/* ---- D: Fabrication ---- */}
                <td className="table-cell">{numInput(row, 'fabSetup')}</td>
                <td className="table-cell">{numInput(row, 'fabCut')}</td>
                <td className="table-cell">{numInput(row, 'fabDrill')}</td>
                <td className="table-cell">{numInput(row, 'fabFeed')}</td>
                <td className="table-cell">{numInput(row, 'fabWeld')}</td>
                <td className="table-cell">{numInput(row, 'fabGrind')}</td>
                <td className="table-cell">{numInput(row, 'fabPaint')}</td>
                <td className="table-cell text-center bg-amber-900/10">
                  <span className="text-xs tabular-nums text-amber-300 font-medium">
                    {fmtNum(row.fabHrsPerPc, 1)}
                  </span>
                </td>
                <td className="table-cell text-center bg-amber-900/10">
                  <span className="text-xs tabular-nums text-amber-300 font-semibold">
                    {fmtNum(row.totalFabHrs, 1)}
                  </span>
                </td>

                {/* ---- E: Installation ---- */}
                <td className="table-cell">{numInput(row, 'instUnload')}</td>
                <td className="table-cell">{numInput(row, 'instRig')}</td>
                <td className="table-cell">{numInput(row, 'instFit')}</td>
                <td className="table-cell">{numInput(row, 'instBolt')}</td>
                <td className="table-cell">{numInput(row, 'instTouchup')}</td>
                <td className="table-cell">{numInput(row, 'instQC')}</td>
                <td className="table-cell text-center bg-green-900/10">
                  <span className="text-xs tabular-nums text-green-300 font-medium">
                    {fmtNum(row.instHrsPerPc, 1)}
                  </span>
                </td>
                <td className="table-cell text-center bg-green-900/10">
                  <span className="text-xs tabular-nums text-green-300 font-semibold">
                    {fmtNum(row.totalInstHrs, 1)}
                  </span>
                </td>

                {/* ---- F: Cost ---- */}
                <td className="table-cell text-center">{currencyCell(row.materialCost)}</td>
                <td className="table-cell text-center">{currencyCell(row.fabCost)}</td>
                <td className="table-cell text-center">{currencyCell(row.installCost)}</td>
                <td className="table-cell text-center bg-red-900/10">
                  <span className="text-xs tabular-nums text-red-300 font-bold">
                    {fmt(row.rowTotal)}
                  </span>
                </td>

                {/* ---- Notes ---- */}
                <td className="table-cell">
                  <input
                    type="text"
                    value={row.notes || ''}
                    onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                    className="input-number text-xs py-1 w-32"
                    placeholder="Notes..."
                  />
                </td>

                {/* ---- Actions ---- */}
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateRow(row)}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Duplicate row"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* ---- Summary row ---- */}
            {rows.length > 0 && (
              <tr className="bg-gray-800 border-t-2 border-gray-600 font-semibold">
                {/* Identification cols: 5 */}
                <td className="table-cell sticky left-0 z-10 bg-gray-800" />
                <td
                  colSpan={4}
                  className="table-cell text-xs text-white sticky left-8 z-10 bg-gray-800"
                >
                  TOTALS
                </td>

                {/* Qty & Weight: 5 */}
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-blue-200 font-semibold">
                    {fmtNum(summary.totalPieces)}
                  </span>
                </td>
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-blue-200 font-semibold">
                    {fmtNum(summary.totalLbs)}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-blue-200 font-semibold">
                    {fmtNum(summary.totalTons, 2)}
                  </span>
                </td>

                {/* Connections: 2 */}
                <td className="table-cell" />
                <td className="table-cell" />

                {/* Fab: 9 â show total in last cell */}
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell text-center bg-amber-900/20">
                  <span className="text-xs tabular-nums text-amber-300">
                    {fmtNum(summary.totalFabHrs, 1)}
                  </span>
                </td>

                {/* Install: 8 â show total in last cell */}
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell" />
                <td className="table-cell text-center bg-green-900/20">
                  <span className="text-xs tabular-nums text-green-300">
                    {fmtNum(summary.totalInstHrs, 1)}
                  </span>
                </td>

                {/* Cost: 4 */}
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-gray-200">
                    {fmt(summary.materialCost)}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-gray-200">
                    {fmt(summary.fabCost)}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span className="text-xs tabular-nums text-gray-200">
                    {fmt(summary.installCost)}
                  </span>
                </td>
                <td className="table-cell text-center bg-red-900/20">
                  <span className="text-sm tabular-nums text-red-300 font-bold">
                    {fmt(summary.grandTotal)}
                  </span>
                </td>

                {/* Notes + Actions */}
                <td className="table-cell" />
                <td className="table-cell" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard label="Total Pieces" value={fmtNum(summary.totalPieces)} color="blue" />
          <SummaryCard
            label="Total Weight"
            value={`${fmtNum(summary.totalLbs)} lb / ${fmtNum(summary.totalTons, 2)} ton`}
            color="blue"
          />
          <SummaryCard label="Fab Hours" value={fmtNum(summary.totalFabHrs, 1)} color="amber" />
          <SummaryCard label="Install Hours" value={fmtNum(summary.totalInstHrs, 1)} color="green" />
          <SummaryCard label="Grand Total" value={fmt(summary.grandTotal)} color="red" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card sub-component
// ---------------------------------------------------------------------------
function SummaryCard({ label, value, color }) {
  const colorMap = {
    blue: 'border-blue-400/80 bg-blue-950 text-blue-100',
    amber: 'border-amber-400/80 bg-amber-950 text-amber-100',
    green: 'border-green-400/80 bg-green-950 text-green-100',
    red: 'border-red-400/80 bg-red-950 text-red-100',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs text-gray-300 mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
