import { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Truck } from 'lucide-react';

/* ─── Helpers ─── */
const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (v) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const CATEGORY_ORDER = [
  'CRANES',
  'TELEHANDLERS',
  'BOOM LIFTS',
  'SCISSOR LIFTS',
  'FORKLIFTS',
  'WELDING & POWER',
  'TRUCKS & TRAILERS',
  'RIGGING & MISC',
];

/* ─── Summary Card (matches Railings/StructuralTakeoff) ─── */
function SummaryCard({ label, value, sub, color = 'blue' }) {
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
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Equipment() {
  const { state, dispatch } = useProject();
  const equipment = state.rates?.equipment || [];
  const markupPct = state.rates?.equipmentMarkup ?? 15;
  const [showAll, setShowAll] = useState(false);
  const [openCat, setOpenCat] = useState(() => {
    const m = {};
    CATEGORY_ORDER.forEach((c) => { m[c] = true; });
    return m;
  });

  const updateRow = (id, field, value) =>
    dispatch({ type: 'UPDATE_EQUIPMENT', payload: { id, [field]: value } });
  const setMarkup = (value) =>
    dispatch({ type: 'SET_EQUIPMENT_MARKUP', payload: value });

  /* Line total = rate[period] × qty × duration + pickup + dropoff (when qty > 0) */
  const lineTotal = (row) => {
    const rateMap = { Day: row.dayRate, Week: row.weekRate, Month: row.monthRate };
    const qty = toNum(row.qty);
    const rental = toNum(rateMap[row.period]) * qty * toNum(row.duration);
    const pickup = qty > 0 ? toNum(row.pickup) : 0;
    const dropoff = qty > 0 ? toNum(row.dropoff) : 0;
    return rental + pickup + dropoff;
  };

  const grouped = useMemo(() => {
    const g = {};
    CATEGORY_ORDER.forEach((c) => { g[c] = []; });
    equipment.forEach((e) => { if (g[e.category]) g[e.category].push(e); });
    return g;
  }, [equipment]);

  const summary = useMemo(() => {
    let totalRental = 0,
      totalPickup = 0,
      totalDropoff = 0,
      activeCount = 0;
    equipment.forEach((row) => {
      const qty = toNum(row.qty);
      if (qty > 0) {
        activeCount++;
        const rateMap = { Day: row.dayRate, Week: row.weekRate, Month: row.monthRate };
        totalRental += toNum(rateMap[row.period]) * qty * toNum(row.duration);
        totalPickup += toNum(row.pickup);
        totalDropoff += toNum(row.dropoff);
      }
    });
    const subtotal = totalRental + totalPickup + totalDropoff;
    const grandTotal = subtotal * (1 + markupPct / 100);
    return { activeCount, totalRental, totalPickup, totalDropoff, subtotal, grandTotal };
  }, [equipment, markupPct]);

  const toggleCat = (cat) => setOpenCat((p) => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-4">
      {/* Accent stripe */}
      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-fire-500 to-amber-500" />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="h-7 w-7 text-fire-400" />
            Equipment Rental
          </h1>
          <p className="text-steel-400 text-sm mt-0.5">
            Cranes, lifts, welders, trucks &amp; rigging — calculate rental usage. Master rates editable in Rates &amp; Config.
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 bg-fire-600/80 text-white text-xs font-semibold rounded">
              {summary.activeCount} active
            </span>
            <span className="px-2 py-0.5 bg-steel-700 text-steel-300 text-xs font-mono rounded">
              {equipment.length} catalog items
            </span>
            <span className="px-2 py-0.5 bg-blue-700/60 text-blue-200 text-xs font-semibold rounded">
              Markup: {pct(markupPct)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-steel-400">Markup %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={markupPct}
            onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
            className="w-20 bg-blue-500/5 border border-blue-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-right font-mono"
          />
          <button
            onClick={() => setShowAll((p) => !p)}
            className="px-3 py-1.5 bg-steel-700 hover:bg-steel-600 text-steel-300 text-xs font-semibold rounded transition-colors"
          >
            {showAll ? 'Active Only' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Active Items" value={summary.activeCount} sub={`of ${equipment.length} catalog`} color="blue" />
        <SummaryCard label="Rental Cost" value={fmt(summary.totalRental)} sub="base rental charges" color="amber" />
        <SummaryCard
          label="Pickup / Dropoff"
          value={fmt(summary.totalPickup + summary.totalDropoff)}
          sub={`${fmt(summary.totalPickup)} / ${fmt(summary.totalDropoff)}`}
          color="cyan"
        />
        <SummaryCard label="Equipment Markup" value={pct(markupPct)} sub="applied to subtotal" color="green" />
        <SummaryCard label="Grand Total" value={fmt(summary.grandTotal)} sub={`incl. ${pct(markupPct)} markup`} color="red" />
      </div>

      {/* Category tables */}
      {CATEGORY_ORDER.map((cat) => {
        const rows = grouped[cat] || [];
        const visible = showAll ? rows : rows.filter((r) => toNum(r.qty) > 0);
        const isOpen = openCat[cat];
        const sub = rows.reduce((s, r) => s + lineTotal(r), 0);
        const active = rows.filter((r) => toNum(r.qty) > 0).length;
        if (!showAll && active === 0) return null;
        return (
          <div key={cat} className="border border-steel-700 rounded-lg bg-steel-900/40 overflow-hidden">
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-3 w-full px-4 py-2.5 bg-steel-800/60 text-left hover:bg-steel-800/80 transition-colors"
            >
              <span className={`text-steel-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-sm font-bold uppercase tracking-wider text-fire-400">{cat}</span>
              <span className="ml-auto flex gap-4 items-center text-xs">
                <span className="text-steel-400">{active} / {rows.length} active</span>
                <span className="text-amber-300 font-mono font-semibold">{fmt(sub)}</span>
              </span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead className="bg-steel-800/40">
                    <tr className="text-[10px] text-steel-400 uppercase">
                      <th className="px-3 py-1.5 text-left">Item</th>
                      <th className="px-2 py-1.5 text-right">Day Rate</th>
                      <th className="px-2 py-1.5 text-right">Week Rate</th>
                      <th className="px-2 py-1.5 text-right">Month Rate</th>
                      <th className="px-2 py-1.5 text-center">Period</th>
                      <th className="px-2 py-1.5 text-center">Qty</th>
                      <th className="px-2 py-1.5 text-center">Duration</th>
                      <th className="px-2 py-1.5 text-right">Pickup $</th>
                      <th className="px-2 py-1.5 text-right">Dropoff $</th>
                      <th className="px-2 py-1.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4 text-steel-500">
                          No items in this category
                        </td>
                      </tr>
                    ) : (
                      visible.map((row) => {
                        const total = lineTotal(row);
                        const isActive = toNum(row.qty) > 0;
                        return (
                          <tr
                            key={row.id}
                            className={`border-t border-steel-800/60 hover:bg-steel-800/30 transition-colors ${
                              isActive ? '' : 'opacity-50'
                            }`}
                          >
                            <td className="px-3 py-1.5 text-white">{row.item}</td>
                            <td className="px-2 py-1.5 text-right text-steel-300 font-mono">{fmt(row.dayRate)}</td>
                            <td className="px-2 py-1.5 text-right text-steel-300 font-mono">{fmt(row.weekRate)}</td>
                            <td className="px-2 py-1.5 text-right text-steel-300 font-mono">{fmt(row.monthRate)}</td>
                            <td className="px-2 py-1.5 text-center">
                              <select
                                value={row.period || 'Day'}
                                onChange={(e) => updateRow(row.id, 'period', e.target.value)}
                                className="bg-steel-900 border border-blue-500/30 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              >
                                <option value="Day" style={{ backgroundColor: '#0c1222' }}>Day</option>
                                <option value="Week" style={{ backgroundColor: '#0c1222' }}>Week</option>
                                <option value="Month" style={{ backgroundColor: '#0c1222' }}>Month</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                min="0"
                                value={row.qty || 0}
                                onChange={(e) => updateRow(row.id, 'qty', parseInt(e.target.value, 10) || 0)}
                                className="w-16 bg-blue-500/5 border border-blue-500/30 rounded px-1 py-0.5 text-center text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                min="0"
                                value={row.duration || 0}
                                onChange={(e) => updateRow(row.id, 'duration', parseInt(e.target.value, 10) || 0)}
                                className="w-16 bg-blue-500/5 border border-blue-500/30 rounded px-1 py-0.5 text-center text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                              />
                            </td>
                            <td
                              className="px-2 py-1.5 text-right text-steel-300 font-mono"
                              title="From Rates & Config (read-only)"
                            >
                              {fmt(row.pickup || 0)}
                            </td>
                            <td
                              className="px-2 py-1.5 text-right text-steel-300 font-mono"
                              title="From Rates & Config (read-only)"
                            >
                              {fmt(row.dropoff || 0)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-green-400 font-mono font-bold">{fmt(total)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Grand total bar */}
      <div className="bg-steel-800/80 border border-steel-600 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-lg font-bold text-white uppercase tracking-wider">Grand Total — Equipment</span>
          <div className="flex gap-5 text-sm font-mono flex-wrap">
            <span className="text-amber-300">Rental: {fmt(summary.totalRental)}</span>
            <span className="text-cyan-300">Pickup/Dropoff: {fmt(summary.totalPickup + summary.totalDropoff)}</span>
            <span className="text-blue-300">Subtotal: {fmt(summary.subtotal)}</span>
            <span className="text-steel-300">Markup: {pct(markupPct)}</span>
            <span className="text-green-400 font-bold text-base">{fmt(summary.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-steel-500 mt-4 pb-2">
        Triple Weld Inc. · Steel Estimator Pro · Equipment Rental
      </div>
    </div>
  );
}
