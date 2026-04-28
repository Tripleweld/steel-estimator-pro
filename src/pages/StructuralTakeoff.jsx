import React, { useState, useCallback, useMemo, useRef, useEffect, Component } from 'react';
import { useProject } from '../context/ProjectContext';
import AISC_SHAPES from '../data/aisc-shapes-data';

/* ─── Error Boundary ─── */
class StructuralErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('StructuralTakeoff crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-steel-950 text-white p-6">
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-6 max-w-2xl mx-auto mt-12">
            <h2 className="text-xl font-bold text-red-400 mb-2">Structural Takeoff Error</h2>
            <p className="text-steel-300 mb-4">The page encountered an error. Try refreshing.</p>
            <pre className="text-xs text-red-300 bg-steel-900 p-3 rounded overflow-auto max-h-40">{String(this.state.error)}</pre>
            <button onClick={() => { this.setState({ hasError: false, error: null }); }} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Section definitions matching Excel layout ─── */
const SECTIONS = [
  { id: 'columns',        label: 'COLUMNS',                     prefix: 'C',     defaultRows: 5  },
  { id: 'beams',           label: 'BEAMS',                       prefix: 'B',     defaultRows: 5  },
  { id: 'moment',          label: 'MOMENT CONNECTIONS',           prefix: 'CONN.', defaultRows: 3  },
  { id: 'roofFrames',      label: 'ROOF OPENING FRAMES',         prefix: 'RF',    defaultRows: 3, headerOverrides: { 'Base Pl (lb)': 'Angle Clip (lbs)' }  },
  { id: 'joists',          label: 'JOISTS (OWSJ)',               prefix: 'J',     defaultRows: 3  },
  { id: 'joistReinf',      label: 'JOIST REINFORCEMENT',         prefix: 'JR',    defaultRows: 3  },
  { id: 'bridging',        label: 'BRIDGING',                    prefix: 'BR',    defaultRows: 2  },
  { id: 'steelDeck',       label: 'STEEL DECK',                  prefix: 'SD',    defaultRows: 2  },
  { id: 'perimeterAngle',  label: 'PERIMETER ANGLE (DECK ENCLOSURE)', prefix: 'PA', defaultRows: 2 },
  { id: 'kneeBrace',       label: 'KNEE BRACE',                  prefix: 'KB',    defaultRows: 2  },
  { id: 'xBracing',        label: 'X-BRACING',                   prefix: 'XB',    defaultRows: 2  },
  { id: 'lintels',         label: 'LINTELS',                     prefix: 'L',     defaultRows: 3  },
];
/* Plate Library for Moment Connections */
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
      label: 'PL ' + w + '"\u00d7' + t.label + '"',
      width: w,
      thickness: t.value,
      thicknessLabel: t.label,
      lbsPerFt: Math.round(w * t.value * 3.4028 * 100) / 100,
    });
  });
});


/* ─── Helpers ─── */
const fmtNum = (v, d = 0) => {
  if (v == null || isNaN(v)) return d === 0 ? '0' : '0.' + '0'.repeat(d);
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtDollar = (v) => '$' + fmtNum(v, 0);
const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const MEMBER_TYPES = [
  'W-Beam', 'W-Column', 'HSS-Round', 'HSS-Rect', 'HSS-Square',
  'Channel', 'Angle', 'Plate', 'Flat Bar', 'Pipe', 'WT', 'OWSJ', 'Deck', 'Other'
];

function makeEmptyRow(sectionId, prefix, index) {
  return {
    id: `${sectionId}_${Date.now()}_${index}`,
    section: sectionId,
    mark: `${prefix}-${index + 1}`,
    dwgRef: '',
    type: '--',
    profile: '',
    qty: 1,
    lengthFt: 0,
    wtPerFt: 0,
    basePlLb: 0,
    anchorsPc: 0,
    setup: 0, cut: 0, drill: 0, feed: 0, weld: 0, grind: 0, paint: 0,
    fabPerPcOverride: null,
    fabCrew: 1,
    unload: 0, rig: 0, fit: 0, bolt: 0, touchUp: 0,
    instPerPcOverride: null,
    instCrew: 2,
    notes: '',
    // Moment connection fields
    ...(sectionId === 'moment' ? { plateSize: '', plateQty: 2, plateLengthFt: 0, wtOverride: null } : {}),
  };
}

/* ─── Summary Card ─── */
function SummaryCard({ label, value, color }) {
  const colorMap = {
    blue:  'border-blue-400/80 bg-blue-950 text-blue-100',
    amber: 'border-amber-400/80 bg-amber-950 text-amber-100',
    green: 'border-green-400/80 bg-green-950 text-green-100',
    red:   'border-red-400/80 bg-red-950 text-red-100',
  };
  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

/* ─── Editable Cell ─── */
function EditCell({ value, onChange, type = 'text', className = '', ...rest }) {
  return (
    <input
      type={type}
      inputMode={type === 'text' ? undefined : 'decimal'}
      value={value ?? ''}
      onChange={onChange}
      onFocus={(e) => e.target.select()}
      className={`w-full bg-blue-500/5 border border-blue-500/30 rounded px-2 py-1 text-sm text-white
        placeholder-steel-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${className}`}
      {...rest}
    />
  );
}

/* ─── Overridable Sum Cell ───
   Shows auto-calculated sum by default.
   When user types a value, it becomes the override.
   Clear the field completely to revert to auto-sum.
   Accepts decimals (0.1, 0.5, etc.) and zero. */
function OverridableCell({ calcValue, override, onOverride, colorClass }) {
  const isOverridden = override != null && override !== '';
  const [editing, setEditing] = useState(false);
  const [rawVal, setRawVal] = useState('');
  const displayValue = isOverridden ? override : calcValue;
  return (
    <input
      type="text"
      inputMode="decimal"
      value={editing ? rawVal : fmtNum(displayValue, 1)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setRawVal(raw);
      }}
      onFocus={(e) => {
        setEditing(true);
        setRawVal(isOverridden ? String(override) : '');
        setTimeout(() => e.target.select(), 0);
      }}
      onBlur={() => {
        setEditing(false);
        if (rawVal === '') {
          onOverride(null);
        } else {
          const n = parseFloat(rawVal);
          if (!isNaN(n)) onOverride(n);
        }
      }}
      className={`w-16 text-right rounded px-1 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${colorClass} ${
        isOverridden
          ? 'bg-amber-900/40 border border-amber-500/50'
          : 'bg-transparent border border-transparent'
      }`}
      title={isOverridden ? `Override: ${override} (auto: ${fmtNum(calcValue, 1)})` : 'Auto-calculated — type to override'}
    />
  );
}

/* ─── Profile Search Dropdown ───
   Searchable dropdown populated with 1,606 AISC profiles.
   Type to filter, click or Enter to select.
   Auto-fills Wt/ft when a profile is selected. */
function ProfileSearch({ value, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [hlIdx, setHlIdx] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = useMemo(() => {
    if (!query || query.length < 1) return AISC_SHAPES.slice(0, 50);
    const q = query.toUpperCase();
    const results = [];
    for (let i = 0; i < AISC_SHAPES.length && results.length < 50; i++) {
      if (AISC_SHAPES[i][0].toUpperCase().includes(q)) results.push(AISC_SHAPES[i]);
    }
    return results;
  }, [query]);

  useEffect(() => { setHlIdx(0); }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current && listRef.current.children[hlIdx]) {
      listRef.current.children[hlIdx].scrollIntoView({ block: 'nearest' });
    }
  }, [hlIdx, open]);

  const pick = (shape) => {
    setQuery(shape[0]);
    setOpen(false);
    onSelect(shape[0], shape[2]);
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHlIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[hlIdx]) { e.preventDefault(); pick(filtered[hlIdx]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="W10x12..."
        className="w-full bg-blue-500/5 border border-blue-500/30 rounded px-2 py-1 text-sm text-white placeholder-steel-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-64 max-h-48 overflow-y-auto bg-steel-900 border border-blue-500/40 rounded shadow-xl" ref={listRef}>
          {filtered.map((s, i) => (
            <div
              key={s[0] + i}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setHlIdx(i)}
              className={`flex justify-between px-2 py-1 text-xs cursor-pointer ${
                i === hlIdx ? 'bg-blue-600 text-white' : 'text-steel-200 hover:bg-steel-800'
              }`}
            >
              <span className="font-mono font-semibold">{s[0]}</span>
              <span className={`ml-2 ${i === hlIdx ? 'text-blue-200' : 'text-steel-400'}`}>{s[2]} lb/ft</span>
              {s[3] && <span className={`ml-1 text-[10px] ${i === hlIdx ? 'text-blue-300' : 'text-steel-500'}`}>({s[3]})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section Header with collapse toggle ─── */
function SectionHeader({ label, isOpen, onToggle, rowCount, sectionTotals, onAddRow }) {
  return (
    <div className="flex items-center justify-between bg-steel-800/80 border border-steel-700 rounded-lg px-4 py-2.5 mt-4 first:mt-0">
      <button onClick={onToggle} className="flex items-center gap-3 text-left flex-1">
        <span className={`text-steel-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-sm font-bold uppercase tracking-wider text-fire-400">{label}</span>
        <span className="text-xs text-steel-500 font-mono">({rowCount} {rowCount === 1 ? 'row' : 'rows'})</span>
        {!isOpen && sectionTotals.totalLbs > 0 && (
          <span className="text-xs text-steel-400 ml-2">
            — {fmtNum(sectionTotals.totalLbs)} lb / {fmtNum(sectionTotals.totalTons, 2)} ton
            &nbsp;•&nbsp; {fmtDollar(sectionTotals.rowTotal)}
          </span>
        )}
      </button>
      <button
        onClick={onAddRow}
        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition-colors"
      >
        + Add Row
      </button>
    </div>
  );
}

/* ─── Helper: get effective fab/inst per piece ─── */
function getEffectiveFabPerPc(row) {
  if (row.fabPerPcOverride != null && row.fabPerPcOverride !== '' && row.fabPerPcOverride !== 0) {
    return toNum(row.fabPerPcOverride);
  }
  return (toNum(row.setup) + toNum(row.cut) + toNum(row.drill) + toNum(row.feed) + toNum(row.weld) + toNum(row.grind) + toNum(row.paint)) / 60;
}

function getEffectiveInstPerPc(row) {
  if (row.instPerPcOverride != null && row.instPerPcOverride !== '' && row.instPerPcOverride !== 0) {
    return toNum(row.instPerPcOverride);
  }
  return (toNum(row.unload) + toNum(row.rig) + toNum(row.fit) + toNum(row.bolt) + toNum(row.touchUp)) / 60;
}


/* ─── Joist Reinforcement Sync Table ─── 
   Auto-reads from JoistReinf Calculator (state.joistReinf).
   Fab/Inst hours are overridable inline. */

/* ─── Moment Connection Row ─── */
function MomentConnectionRow({ row, index, fabRate, installRate, steelRate, onUpdate, onDelete }) {
  const plate = PLATE_LIBRARY.find(p => p.id === row.plateSize);
  const lbsPerFt = plate ? plate.lbsPerFt : 0;
  const pQty = toNum(row.plateQty) || 0;
  const pLen = toNum(row.plateLengthFt) || 0;
  const totalLbs = row.wtOverride != null ? toNum(row.wtOverride) : Math.round(pQty * lbsPerFt * pLen * 100) / 100;
  const totalTon = totalLbs / 2000;
  const calcFabPerPc = (toNum(row.setup) + toNum(row.cut) + toNum(row.drill) + toNum(row.feed) + toNum(row.weld) + toNum(row.grind) + toNum(row.paint)) / 60;
  const fabPerPc = row.fabPerPcOverride != null ? toNum(row.fabPerPcOverride) : calcFabPerPc;
  const totFab = fabPerPc * (toNum(row.fabCrew) || 1);
  const calcInstPerPc = (toNum(row.unload) + toNum(row.rig) + toNum(row.fit) + toNum(row.bolt) + toNum(row.touchUp)) / 60;
  const instPerPc = row.instPerPcOverride != null ? toNum(row.instPerPcOverride) : calcInstPerPc;
  const totInst = instPerPc * (toNum(row.instCrew) || 1);
  const matCost = totalLbs * steelRate;
  const fabCost = totFab * fabRate;
  const instCost = totInst * installRate;
  const rowTotal = matCost + fabCost + instCost;
  const set = (field) => (e) => { onUpdate(row.id, { [field]: e.target.value }); };
  const mcSel = 'w-full bg-steel-900 border border-blue-500/30 rounded px-1 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50';
  const mcIn = 'w-full bg-steel-900 border border-steel-600 rounded px-1 py-1 text-sm text-white text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50';
  const mcRo = 'text-sm text-right font-mono';
  return (
    <tr className="border-b border-steel-800/50 hover:bg-steel-800/30 transition-colors">
      <td className="px-1 py-1 text-center text-xs text-steel-500 font-mono w-8">{index + 1}</td>
      <td className="px-1 py-1"><EditCell value={row.mark} onChange={set('mark')} /></td>
      <td className="px-1 py-1"><EditCell value={row.dwgRef} onChange={set('dwgRef')} placeholder="S-101" /></td>
      <td className="px-1 py-1"><EditCell value={row.notes} onChange={set('notes')} placeholder="Location" /></td>
      <td className="px-1 py-1" style={{minWidth:'160px'}}>
        <select value={row.plateSize || ''} onChange={e => onUpdate(row.id, { plateSize: e.target.value })} className={mcSel}>
          <option value="" style={{backgroundColor:'#0c1222',color:'white'}}>-- Select Plate --</option>
          {PLATE_LIBRARY.map(p => <option key={p.id} value={p.id} style={{backgroundColor:'#0c1222',color:'white'}}>{p.label}</option>)}
        </select>
      </td>
      <td className="px-1 py-1 text-sm text-right text-steel-400 font-mono" style={{minWidth:'70px'}}>{lbsPerFt > 0 ? fmtNum(lbsPerFt, 2) : '—'}</td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.plateQty} onChange={e => onUpdate(row.id, { plateQty: e.target.value })} className={mcIn} style={{width:'50px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.plateLengthFt} onChange={e => onUpdate(row.id, { plateLengthFt: e.target.value })} className={mcIn} style={{width:'60px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.wtOverride != null ? row.wtOverride : ''} onChange={e => onUpdate(row.id, { wtOverride: e.target.value === '' ? null : e.target.value })} placeholder={fmtNum(pQty * lbsPerFt * pLen, 1)} className={mcIn + ' placeholder:text-steel-500'} style={{width:'70px'}} title="Override total weight (leave blank for auto)" /></td>
      <td className="px-1 py-1 text-sm text-right text-white font-mono font-bold">{fmtNum(totalLbs, 1)}</td>
      <td className="px-1 py-1 text-sm text-right text-steel-400 font-mono">{fmtNum(totalTon, 3)}</td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.basePlLb} onChange={set('basePlLb')} className={mcIn} style={{width:'55px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.anchorsPc} onChange={set('anchorsPc')} className={mcIn} style={{width:'55px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.setup} onChange={set('setup')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.cut} onChange={set('cut')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.drill} onChange={set('drill')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.feed} onChange={set('feed')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.weld} onChange={set('weld')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.grind} onChange={set('grind')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.paint} onChange={set('paint')} className={mcIn} style={{width:'45px'}} /></td>
      <td className='px-1 py-1'><OverridableCell calcValue={calcFabPerPc} override={row.fabPerPcOverride} onOverride={(v) => onUpdate(row.id, { fabPerPcOverride: v })} colorClass='text-green-400' /></td>
      <td className={'px-1 py-1 ' + mcRo + ' text-white'}>{fmtNum(totFab, 2)}</td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.fabCrew || 1} onChange={e => onUpdate(row.id, { fabCrew: e.target.value })} className={mcIn} style={{width:'40px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.unload} onChange={set('unload')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.rig} onChange={set('rig')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.fit} onChange={set('fit')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.bolt} onChange={set('bolt')} className={mcIn} style={{width:'45px'}} /></td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.touchUp} onChange={set('touchUp')} className={mcIn} style={{width:'45px'}} /></td>
      <td className='px-1 py-1'><OverridableCell calcValue={calcInstPerPc} override={row.instPerPcOverride} onOverride={(v) => onUpdate(row.id, { instPerPcOverride: v })} colorClass='text-cyan-400' /></td>
      <td className={'px-1 py-1 ' + mcRo + ' text-white'}>{fmtNum(totInst, 2)}</td>
      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.instCrew || 2} onChange={e => onUpdate(row.id, { instCrew: e.target.value })} className={mcIn} style={{width:'40px'}} /></td>
      <td className="px-1 py-1 text-sm text-right text-steel-300 font-mono">{fmtDollar(matCost)}</td>
      <td className="px-1 py-1 text-sm text-right text-steel-300 font-mono">{fmtDollar(fabCost)}</td>
      <td className="px-1 py-1 text-sm text-right text-steel-300 font-mono">{fmtDollar(instCost)}</td>
      <td className="px-1 py-1 text-sm text-right text-white font-bold font-mono">{fmtDollar(rowTotal)}</td>
      <td className="px-1 py-1 text-center"><button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-400 text-xs">✕</button></td>
    </tr>
  );
}


/* ─── Moment Connection Table ─── */
function MomentConnectionTable({ sectionRows, fabRate, installRate, steelRate, onUpdate, onDelete }) {
  const mcColGroups = [
    { label: 'Identification', cols: 3, color: 'bg-purple-800/60', border: 'border-purple-500' },
    { label: 'Plate Selection & Weight', cols: 8, color: 'bg-orange-800/60', border: 'border-orange-500' },
    { label: 'Connections', cols: 1, color: 'bg-red-800/60', border: 'border-red-500' },
    { label: 'Fabrication Hours', cols: 10, color: 'bg-amber-800/60', border: 'border-amber-500' },
    { label: 'Installation Hours', cols: 8, color: 'bg-cyan-800/60', border: 'border-cyan-500' },
    { label: 'Cost Preview', cols: 5, color: 'bg-emerald-800/60', border: 'border-emerald-500' },
  ];
  const mcSubHeaders = [
    'Mark','Dwg Ref','Location',
    'Plate Size','Lbs/ft','Plate Qty','Length (ft)','Wt Override','Total (lb)','Total (ton)',
    'Extra Pl (lb)','Bolts',
    'Setup','Cut','Drill','Feed','Weld','Grind','Paint','Fab/Pc (h)','Tot Fab (h)','Fab Crew',
    'Unload','Rig','Fit','Bolt','Touch-up','Inst/Pc (h)','Tot Inst (h)','Inst Crew',
    'Material','Fab $','Install $','Total',
  ];
  let tW = 0, tFab = 0, tInst = 0, tMat = 0, tFabC = 0, tInstC = 0, tTotal = 0;
  sectionRows.forEach(row => {
    const plate = PLATE_LIBRARY.find(p => p.id === row.plateSize);
    const lbsPerFt = plate ? plate.lbsPerFt : 0;
    const pQty = toNum(row.plateQty) || 0;
    const pLen = toNum(row.plateLengthFt) || 0;
    const totalLbs = row.wtOverride != null ? toNum(row.wtOverride) : pQty * lbsPerFt * pLen;
    const calcFabPc = (toNum(row.setup)+toNum(row.cut)+toNum(row.drill)+toNum(row.feed)+toNum(row.weld)+toNum(row.grind)+toNum(row.paint))/60;
    const fabPc = row.fabPerPcOverride != null ? toNum(row.fabPerPcOverride) : calcFabPc;
    const totFab = fabPc * (toNum(row.fabCrew)||1);
    const calcInstPc = (toNum(row.unload)+toNum(row.rig)+toNum(row.fit)+toNum(row.bolt)+toNum(row.touchUp))/60;
    const instPc = row.instPerPcOverride != null ? toNum(row.instPerPcOverride) : calcInstPc;
    const totInstH = instPc * (toNum(row.instCrew)||1);
    tW += totalLbs; tFab += totFab; tInst += totInstH;
    tMat += totalLbs * steelRate; tFabC += totFab * fabRate; tInstC += totInstH * installRate;
  });
  tTotal = tMat + tFabC + tInstC;
  return (
    <div className="overflow-x-auto border border-steel-700 rounded-b-lg bg-steel-900/50">
      <table className="w-full text-left whitespace-nowrap" style={{minWidth:'2200px'}}>
        <thead>
          <tr>
            <th className="w-8 bg-steel-800"></th>
            {mcColGroups.map((g,i) => (
              <th key={i} colSpan={g.cols} className={'text-center text-[10px] font-bold uppercase tracking-wider py-1.5 border-b-2 ' + g.color + ' ' + g.border + ' text-white'}>{g.label}</th>
            ))}
            <th className="w-8 bg-steel-800"></th>
          </tr>
          <tr className="bg-steel-800/80 text-[10px] text-steel-300 uppercase">
            <th className="px-1 py-1.5 text-center">#</th>
            {mcSubHeaders.map((h,i) => <th key={i} className="px-1 py-1.5 text-center">{h}</th>)}
            <th className="px-1 py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {sectionRows.map((row, i) => (
            <MomentConnectionRow key={row.id} row={row} index={i} fabRate={fabRate} installRate={installRate} steelRate={steelRate} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
          <tr className="bg-steel-800/80 font-bold text-sm border-t-2 border-steel-600">
            <td colSpan={9} className="px-2 py-2 text-right text-steel-300 uppercase text-xs">Section Totals</td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtNum(tW, 0)}</td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtNum(tW/2000, 3)}</td>
            <td colSpan={12}></td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtNum(tFab, 1)}</td>
            <td></td>
            <td colSpan={5}></td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtNum(tInst, 1)}</td>
            <td></td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtDollar(tMat)}</td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtDollar(tFabC)}</td>
            <td className="px-1 py-1 text-right text-white font-mono">{fmtDollar(tInstC)}</td>
            <td className="px-1 py-1 text-right text-yellow-400 font-mono">{fmtDollar(tTotal)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function JoistReinfSyncTable({ fabRate, installRate }) {
  const { state } = useProject();
  const jrRows = state.joistReinf || [];
  // Get structural steel rate from Rates & Config (default $1.00/lb)
  const steelRate = (state.rates?.materialRates || []).find(r => r.item === 'Structural steel')?.rate || 1.00;

  const purchasedCosts = useMemo(() => {
    const rows = state.purchased || [];
    const joistCost = rows.filter(r => r.category === 'joists').reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);
    const deckCost = rows.filter(r => r.category === 'deck').reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);
    return { joists: joistCost, deck: deckCost };
  }, [state.purchased]);
  const [ovr, setOvr] = useState({});
  const gv = (id, f, cv) => { const k = id+'_'+f; return ovr[k] != null ? ovr[k] : cv; };
  const sv = (id, f, v) => setOvr(p => ({...p, [id+'_'+f]: v === '' ? null : Number(v) || 0}));

  if (jrRows.length === 0) return (
    <div className="text-center py-6 text-steel-500 text-sm">
      No joist reinforcement items. <a href="/joist-reinf" className="text-blue-400 hover:text-blue-300 underline">Open Calculator</a>
    </div>
  );

  // weightLbs and instHrs from sync ALREADY include qty — do NOT multiply by q again
  let tW=0, tI=0, tMat=0, tIC=0;
  return (
    <div className="overflow-x-auto border border-steel-700 rounded-b-lg bg-steel-900/50">
      <div className="px-3 py-1.5 bg-amber-900/30 border-b border-amber-500/30 text-amber-300 text-xs font-medium">
        \u26a1 Auto-synced from Joist Reinforcement Calculator \u2014 edit hours to override
      </div>
      <table className="w-full text-left whitespace-nowrap" style={{minWidth:'900px'}}>
        <thead><tr className="bg-steel-800 text-[10px] text-steel-300 uppercase">
          <th className="px-2 py-1.5">#</th><th className="px-2 py-1.5">Mark</th>
          <th className="px-2 py-1.5">Location</th><th className="px-2 py-1.5">Joist</th>
          <th className="px-2 py-1.5">Method</th><th className="px-2 py-1.5 text-right">Qty</th>
          <th className="px-2 py-1.5 text-right">Weight (lbs)</th>
          <th className="px-2 py-1.5 text-right">Install Hrs</th>
          <th className="px-2 py-1.5 text-right">Material $</th>
          <th className="px-2 py-1.5 text-right">Install $</th>
          <th className="px-2 py-1.5 text-right">Row Total</th>
        </tr></thead>
        <tbody>
        {jrRows.map((r,i) => {
          const q = Number(r.qty) || 0;
          const w = Number(r.weightLbs) || 0;
          const iH = gv(r.id, 'inst', Number(r.instHrs) || 0);
          // weightLbs already includes qty, instHrs already includes qty+crew
          const mat = w * steelRate;
          const ic = iH * installRate;
          tW += w; tI += iH; tMat += mat; tIC += ic;
          return (
            <tr key={r.id} className="border-b border-steel-800/50 hover:bg-steel-800/30 transition-colors">
              <td className="px-2 py-1 text-xs text-steel-500">{i+1}</td>
              <td className="px-2 py-1 text-sm text-white font-medium">{r.mark || '\u2014'}</td>
              <td className="px-2 py-1 text-sm text-steel-300">{r.location || '\u2014'}</td>
              <td className="px-2 py-1 text-sm text-steel-300">{r.joistType}</td>
              <td className="px-2 py-1 text-sm text-steel-300">{r.reinfMethod}</td>
              <td className="px-2 py-1 text-sm text-right text-white">{q}</td>
              <td className="px-2 py-1 text-sm text-right text-steel-300">{fmtNum(w, 0)}</td>
              <td className="px-2 py-1 text-right"><input type="text" inputMode="decimal" value={iH} onChange={e => sv(r.id, 'inst', e.target.value)} className="w-16 text-right bg-amber-900/40 border border-amber-500/50 rounded px-1 py-0.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"/></td>
              <td className="px-2 py-1 text-sm text-right text-steel-300">{fmtDollar(mat)}</td>
              <td className="px-2 py-1 text-sm text-right text-steel-300">{fmtDollar(ic)}</td>
              <td className="px-2 py-1 text-sm text-right text-white font-bold">{fmtDollar(mat + ic)}</td>
            </tr>);
        })}
        <tr className="bg-steel-800/80 font-bold text-sm">
          <td colSpan={6} className="px-2 py-2 text-right text-steel-300 uppercase text-xs">Totals</td>
          <td className="px-2 py-1 text-right text-white">{fmtNum(tW, 0)}</td>
          <td className="px-2 py-1 text-right text-white">{fmtNum(tI, 1)}</td>
          <td className="px-2 py-1 text-right text-white">{fmtDollar(tMat)}</td>
          <td className="px-2 py-1 text-right text-white">{fmtDollar(tIC)}</td>
          <td className="px-2 py-1 text-right text-yellow-400">{fmtDollar(tMat + tIC)}</td>
        </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── The Data Row ─── */
function DataRow({ row, index, fabRate, installRate, onUpdate, onDelete }) {
  const totalLbs = toNum(row.qty) * toNum(row.lengthFt) * toNum(row.wtPerFt);
  const totalTon = totalLbs / 2000;
  const calcFabPerPc = (toNum(row.setup) + toNum(row.cut) + toNum(row.drill) + toNum(row.feed) + toNum(row.weld) + toNum(row.grind) + toNum(row.paint)) / 60;
  const fabPerPc = getEffectiveFabPerPc(row);
  const totFab = fabPerPc * toNum(row.qty) * (toNum(row.fabCrew) || 1);
  const calcInstPerPc = (toNum(row.unload) + toNum(row.rig) + toNum(row.fit) + toNum(row.bolt) + toNum(row.touchUp)) / 60;
  const instPerPc = getEffectiveInstPerPc(row);
  const totInst = instPerPc * toNum(row.qty) * (toNum(row.instCrew) || 1);
  const matCost = totalLbs * 1.15;
  const fabCost = totFab * fabRate;
  const instCost = totInst * installRate;
  const rowTotal = matCost + fabCost + instCost;

  const set = (field) => (e) => {
    const v = e.target.value;
    onUpdate(row.id, { [field]: ['mark','dwgRef','type','profile','notes'].includes(field) ? v : v });
  };

  return (
    <tr className="border-b border-steel-800/50 hover:bg-steel-800/30 transition-colors">
      {/* Row # */}
      <td className="px-1 py-1 text-center text-xs text-steel-500 font-mono w-8">{index + 1}</td>
      {/* Mark */}
      <td className="px-1 py-1"><EditCell value={row.mark} onChange={set('mark')} /></td>
      {/* Dwg Ref */}
      <td className="px-1 py-1"><EditCell value={row.dwgRef} onChange={set('dwgRef')} placeholder="S-101" /></td>
      {/* Type */}
      <td className="px-1 py-1">
        <select value={row.type || '--'} onChange={set('type')}
          className="w-full bg-steel-900 border border-blue-500/30 rounded px-1 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50">
          <option value="--" style={{ backgroundColor: "#0c1222", color: "white" }}>--</option>
          {MEMBER_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: "#0c1222", color: "white" }}>{t}</option>)}
        </select>
      </td>
      {/* Profile — AISC searchable dropdown */}
      <td className="px-1 py-1">
        <ProfileSearch
          value={row.profile}
          onSelect={(designation, wtPerFt) => onUpdate(row.id, { profile: designation, wtPerFt })}
        />
      </td>
      {/* Qty */}
      <td className="px-1 py-1"><EditCell value={row.qty} onChange={set('qty')} type="text" inputMode="decimal" className="text-right w-14" /></td>
      {/* Length */}
      <td className="px-1 py-1"><EditCell value={row.lengthFt} onChange={set('lengthFt')} type="text" inputMode="decimal" className="text-right w-16" /></td>
      {/* Wt/ft */}
      <td className="px-1 py-1 text-right text-sm text-white font-mono">{row.wtPerFt || '--'}</td>
      {/* Total lb */}
      <td className="px-1 py-1 text-right text-sm text-white font-mono">{fmtNum(totalLbs)}</td>
      {/* Total ton */}
      <td className="px-1 py-1 text-right text-sm text-white font-mono">{fmtNum(totalTon, 2)}</td>
      {/* Base Pl */}
      <td className="px-1 py-1"><EditCell value={row.basePlLb} onChange={set('basePlLb')} type="text" inputMode="decimal" className="text-right w-16" /></td>
      {/* Anchors */}
      <td className="px-1 py-1"><EditCell value={row.anchorsPc} onChange={set('anchorsPc')} type="text" inputMode="decimal" className="text-right w-14" /></td>
      {/* Fab hours: setup, cut, drill, feed, weld, grind, paint */}
      {['setup','cut','drill','feed','weld','grind','paint'].map(f => (
        <td key={f} className="px-1 py-1"><EditCell value={row[f]} onChange={set(f)} type="text" inputMode="decimal" className="text-right w-12" /></td>
      ))}
      {/* Fab/Pc — overridable */}
      <td className="px-1 py-1">
        <OverridableCell
          calcValue={calcFabPerPc}
          override={row.fabPerPcOverride}
          onOverride={(v) => onUpdate(row.id, { fabPerPcOverride: v })}
          colorClass="text-amber-300"
        />
      </td>
      {/* Tot Fab */}
      <td className="px-1 py-1 text-right text-sm text-amber-300 font-mono font-bold">{fmtNum(totFab, 1)}</td>
      {/* Fab Crew */}
      <td className="px-1 py-1"><EditCell value={row.fabCrew} onChange={set('fabCrew')} type="text" inputMode="decimal" className="text-right w-12" /></td>
      {/* Install hours: unload, rig, fit, bolt, touchUp */}
      {['unload','rig','fit','bolt','touchUp'].map(f => (
        <td key={f} className="px-1 py-1"><EditCell value={row[f]} onChange={set(f)} type="text" inputMode="decimal" className="text-right w-12" /></td>
      ))}
      {/* Inst/Pc — overridable */}
      <td className="px-1 py-1">
        <OverridableCell
          calcValue={calcInstPerPc}
          override={row.instPerPcOverride}
          onOverride={(v) => onUpdate(row.id, { instPerPcOverride: v })}
          colorClass="text-cyan-300"
        />
      </td>
      {/* Tot Inst */}
      <td className="px-1 py-1 text-right text-sm text-cyan-300 font-mono font-bold">{fmtNum(totInst, 1)}</td>
      {/* Inst Crew */}
      <td className="px-1 py-1"><EditCell value={row.instCrew} onChange={set('instCrew')} type="text" inputMode="decimal" className="text-right w-12" /></td>
      {/* Cost preview */}
      <td className="px-1 py-1 text-right text-sm text-steel-300 font-mono">{fmtDollar(matCost)}</td>
      <td className="px-1 py-1 text-right text-sm text-steel-300 font-mono">{fmtDollar(fabCost)}</td>
      <td className="px-1 py-1 text-right text-sm text-steel-300 font-mono">{fmtDollar(instCost)}</td>
      <td className="px-1 py-1 text-right text-sm text-green-400 font-mono font-bold">{fmtDollar(rowTotal)}</td>
      {/* Notes */}
      <td className="px-1 py-1"><EditCell value={row.notes} onChange={set('notes')} placeholder="" className="w-24" /></td>
      {/* Delete */}
      <td className="px-1 py-1 text-center">
        <button onClick={() => onDelete(row.id)} className="text-red-500/60 hover:text-red-400 text-xs">✕</button>
      </td>
    </tr>
  );
}

/* ─── Section Totals Row ─── */
function SectionTotalsRow({ rows, fabRate, installRate, purchasedMaterial = 0 }) {
  const t = calcSectionTotals(rows, fabRate, installRate);
  return (
    <tr className="bg-steel-800/40 border-t border-steel-600 font-semibold text-sm">
      <td colSpan={4} className="px-2 py-1.5 text-right text-steel-400 uppercase text-xs tracking-wider">Section Totals</td>
      <td></td>
      <td className="px-1 py-1.5 text-right text-white font-mono">{fmtNum(t.totalPcs)}</td>
      <td></td><td></td>
      <td className="px-1 py-1.5 text-right text-white font-mono">{fmtNum(t.totalLbs)}</td>
      <td className="px-1 py-1.5 text-right text-white font-mono">{fmtNum(t.totalTons, 2)}</td>
      <td colSpan={2}></td>
      <td colSpan={7}></td>
      <td className="px-1 py-1.5 text-right text-amber-300 font-mono">{fmtNum(t.avgFabPerPc, 1)}</td>
      <td className="px-1 py-1.5 text-right text-amber-300 font-mono font-bold">{fmtNum(t.totFab, 1)}</td>
      <td></td>
      <td colSpan={5}></td>
      <td className="px-1 py-1.5 text-right text-cyan-300 font-mono">{fmtNum(t.avgInstPerPc, 1)}</td>
      <td className="px-1 py-1.5 text-right text-cyan-300 font-mono font-bold">{fmtNum(t.totInst, 1)}</td>
      <td></td>
      <td className="px-1 py-1.5 text-right font-mono" style={purchasedMaterial > 0 ? {color:'#f59e0b'} : {color:'#cbd5e1'}}>{fmtDollar(t.matCost + purchasedMaterial)}{purchasedMaterial > 0 && <span className="text-[9px] text-amber-500/70 block">incl. purchased</span>}</td>
      <td className="px-1 py-1.5 text-right text-steel-300 font-mono">{fmtDollar(t.fabCost)}</td>
      <td className="px-1 py-1.5 text-right text-steel-300 font-mono">{fmtDollar(t.instCost)}</td>
      <td className="px-1 py-1.5 text-right text-green-400 font-mono font-bold">{fmtDollar(t.rowTotal + purchasedMaterial)}</td>
      <td colSpan={2}></td>
    </tr>
  );
}

/* ─── Calculate totals for a section ─── */
function calcSectionTotals(rows, fabRate, installRate, steelRate) {
  let totalPcs = 0, totalLbs = 0, totFab = 0, totInst = 0;
  rows.forEach(r => {
    let lbs;
    if (r.section === 'moment') {
      const plate = PLATE_LIBRARY.find(p => p.id === r.plateSize);
      const plbsft = plate ? plate.lbsPerFt : 0;
      lbs = r.wtOverride != null ? toNum(r.wtOverride) : toNum(r.plateQty) * plbsft * toNum(r.plateLengthFt);
      totalPcs += 1;
    } else {
      lbs = toNum(r.qty) * toNum(r.lengthFt) * toNum(r.wtPerFt);
      totalPcs += toNum(r.qty);
    }
    const fabPc = getEffectiveFabPerPc(r);
    const instPc = getEffectiveInstPerPc(r);
    totalLbs += lbs;
    totFab += r.section === 'moment' ? fabPc * (toNum(r.fabCrew)||1) : fabPc * toNum(r.qty);
    totInst += r.section === 'moment' ? instPc * (toNum(r.instCrew)||1) : instPc * toNum(r.qty);
  });
  const totalTons = totalLbs / 2000;
  const matCost = totalLbs * (steelRate || 1.15);
  const fabCost = totFab * fabRate;
  const instCost = totInst * installRate;
  return {
    totalPcs, totalLbs, totalTons, totFab, totInst,
    avgFabPerPc: rows.length ? totFab / Math.max(totalPcs, 1) : 0,
    avgInstPerPc: rows.length ? totInst / Math.max(totalPcs, 1) : 0,
    matCost, fabCost, instCost, rowTotal: matCost + fabCost + instCost,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function StructuralTakeoffInner() {
  const { state, dispatch } = useProject();
  const fabRate = toNum(state.rates?.labourRates?.fabRate ?? 50);
  const installRate = toNum(state.rates?.labourRates?.installRate ?? 55);
  const steelRate = (state.rates?.materialRates || []).find(m => m.item === 'Structural steel')?.rate ?? 1.00;

  /* ─── Row state: all rows stored flat, each has a .section field ─── */
  const [rows, setRows] = useState(() => {
    const saved = state.structuralRows;
    if (saved && saved.length > 0) return saved;
    return [];
  });

  /* ─── Section open/close state ─── */
  const [openSections, setOpenSections] = useState(() => {
    const m = {};
    SECTIONS.forEach(s => { m[s.id] = true; });
    return m;
  });

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* ─── Row CRUD ─── */
  const addRow = useCallback((sectionId) => {
    setRows(prev => {
      const sec = SECTIONS.find(s => s.id === sectionId);
      const sectionRows = prev.filter(r => r.section === sectionId);
      const newRow = makeEmptyRow(sectionId, sec.prefix, sectionRows.length);
      const lastIdx = prev.reduce((acc, r, i) => r.section === sectionId ? i : acc, -1);
      if (lastIdx === -1) {
        const sIdx = SECTIONS.findIndex(s => s.id === sectionId);
        let insertIdx = 0;
        for (let i = 0; i < sIdx; i++) {
          insertIdx += prev.filter(r => r.section === SECTIONS[i].id).length;
        }
        const next = [...prev];
        next.splice(insertIdx, 0, newRow);
        return next;
      }
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newRow);
      return next;
    });
  }, []);

  const updateRow = useCallback((id, updates) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRow = useCallback((id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  /* ─── Save rows to context on change ─── */
  useEffect(() => {
    dispatch({ type: 'SET_STRUCTURAL_ROWS', payload: rows });
  }, [rows, dispatch]);

  /* ─── Grand totals ─── */
  const grandTotals = useMemo(() => {
    return calcSectionTotals(rows, fabRate, installRate);
  }, [rows, fabRate, installRate]);

  /* ─── Column headers ─── */
  const colGroups = [
    { label: 'Identification', cols: 4, color: 'bg-purple-800/60', border: 'border-purple-500' },
    { label: 'Quantity & Weight', cols: 5, color: 'bg-green-800/60', border: 'border-green-500' },
    { label: 'Connections & Hardware', cols: 2, color: 'bg-red-800/60', border: 'border-red-500' },
    { label: 'Fabrication Hours (per piece)', cols: 10, color: 'bg-amber-800/60', border: 'border-amber-500' },
    { label: 'Installation Hours (per piece)', cols: 8, color: 'bg-cyan-800/60', border: 'border-cyan-500' },
    { label: 'Cost Preview', cols: 4, color: 'bg-emerald-800/60', border: 'border-emerald-500' },
    { label: 'Notes', cols: 1, color: 'bg-steel-700', border: 'border-steel-500' },
  ];

  const subHeaders = [
    'Mark','Dwg Ref','Type','Profile',
    'Qty','Length (ft)','Wt/ft (lb)','Total (lb)','Total (ton)',
    'Base Pl (lb)','Anchors/pc',
    'Setup (min)','Cut (min)','Drill (min)','Feed (min)','Weld (min)','Grind (min)','Paint (min)','Fab/Pc (hrs)','Tot Fab (hrs)','Fab Crew',
    'Unload (min)','Rig (min)','Fit (min)','Bolt (min)','Touch-up (min)','Inst/Pc (hrs)','Tot Inst (hrs)','Inst Crew',
    'Material $','Fab $','Install $','Row Total',
    'Notes',
  ];

  /* ───────────────── RENDER ───────────────── */
  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-4">
      {/* Accent stripe */}
      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-fire-500 to-amber-500" />

      {/* Page title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-fire-400">⛑</span> Structural Steel Takeoff
          </h1>
          <p className="text-steel-400 text-sm mt-0.5">Division 05 12 00 — Structural Steel Framing</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-fire-600/80 text-white text-xs font-semibold rounded">Fab Rate: ${fabRate}/hr</span>
            <span className="px-2 py-0.5 bg-green-600/80 text-white text-xs font-semibold rounded">Install Rate: ${installRate}/hr</span>
            <span className="px-2 py-0.5 bg-steel-700 text-steel-300 text-xs font-mono rounded">{rows.length} rows</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenSections(prev => {
              const allOpen = Object.values(prev).every(v => v);
              const next = {};
              SECTIONS.forEach(s => { next[s.id] = !allOpen; });
              return next;
            })}
            className="px-3 py-1.5 bg-steel-700 hover:bg-steel-600 text-steel-300 text-xs font-semibold rounded transition-colors"
          >
            {Object.values(openSections).every(v => v) ? '⊟ Collapse All' : '⊞ Expand All'}
          </button>
        </div>
      </div>

      {/* Grand Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <SummaryCard label="Total Pieces" value={fmtNum(grandTotals.totalPcs)} color="blue" />
        <SummaryCard label="Total Weight" value={`${fmtNum(grandTotals.totalLbs)} lb / ${fmtNum(grandTotals.totalTons, 2)} ton`} color="blue" />
        <SummaryCard label="Fab Hours" value={fmtNum(grandTotals.totFab, 1)} color="green" />
        <SummaryCard label="Install Hours" value={fmtNum(grandTotals.totInst, 1)} color="green" />
        <SummaryCard label="Grand Total" value={fmtDollar(grandTotals.rowTotal)} color="red" />
      </div>

      {/* ─── Sections ─── */}
      <div className="space-y-1">
        {SECTIONS.map(sec => {
          const sectionRows = rows.filter(r => r.section === sec.id);
          const sectionTotals = calcSectionTotals(sectionRows, fabRate, installRate, steelRate);
          const isOpen = openSections[sec.id];

          return (
            <div key={sec.id}>
              <SectionHeader
                label={sec.label}
                isOpen={isOpen}
                onToggle={() => toggleSection(sec.id)}
                rowCount={sectionRows.length}
                sectionTotals={sectionTotals}
                onAddRow={() => addRow(sec.id)}
              />

              {isOpen && (sec.id === 'moment' ? <MomentConnectionTable sectionRows={sectionRows} fabRate={fabRate} installRate={installRate} steelRate={steelRate} onUpdate={updateRow} onDelete={deleteRow} /> : sec.id === 'joistReinf' ? <JoistReinfSyncTable fabRate={fabRate} installRate={installRate} /> : (
                <div className="overflow-x-auto border border-steel-700 rounded-b-lg bg-steel-900/50">
                  <table className="w-full text-left whitespace-nowrap" style={{ minWidth: '2400px' }}>
                    {/* Column group headers */}
                    <thead>
                      <tr>
                        <th className="w-8 bg-steel-800"></th>
                        {colGroups.map((g, i) => (
                          <th key={i} colSpan={g.cols}
                            className={`text-center text-[10px] font-bold uppercase tracking-wider py-1.5 border-b-2 ${g.color} ${g.border} text-white`}>
                            {g.label}
                          </th>
                        ))}
                        <th className="w-8 bg-steel-800"></th>
                      </tr>
                      <tr className="bg-steel-800">
                        <th className="px-1 py-1.5 text-[10px] font-bold text-steel-400 uppercase">#</th>
                        {(sec.headerOverrides ? subHeaders.map(h => sec.headerOverrides[h] || h) : subHeaders).map((h, i) => (
                          <th key={i} className="px-1 py-1.5 text-[10px] font-bold text-steel-300 uppercase tracking-wider">{h}</th>
                        ))}
                        <th className="px-1 py-1.5 text-[10px] font-bold text-steel-400 uppercase">Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.length === 0 ? (
                        <tr>
                          <td colSpan={36} className="text-center py-6 text-steel-500 text-sm">
                            No rows yet.{' '}
                            <button onClick={() => addRow(sec.id)} className="text-blue-400 hover:text-blue-300 underline">
                              Add first row
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {sectionRows.map((row, idx) => (
                            <DataRow
                              key={row.id}
                              row={row}
                              index={idx}
                              fabRate={fabRate}
                              installRate={installRate}
                              onUpdate={updateRow}
                              onDelete={deleteRow}
                            />
                          ))}
                          <SectionTotalsRow rows={sectionRows} fabRate={fabRate} installRate={installRate} purchasedMaterial={sec.id === 'joists' ? purchasedCosts.joists : sec.id === 'steelDeck' ? purchasedCosts.deck : 0} />
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Grand Total Bar */}
      <div className="bg-steel-800/80 border border-steel-600 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white uppercase tracking-wider">Grand Totals — All Sections</span>
          <div className="flex gap-6 text-sm font-mono">
            <span className="text-steel-300">{fmtNum(grandTotals.totalPcs)} pcs</span>
            <span className="text-steel-300">{fmtNum(grandTotals.totalLbs)} lb</span>
            <span className="text-white font-bold">{fmtNum(grandTotals.totalTons, 2)} ton</span>
            <span className="text-amber-300">{fmtNum(grandTotals.totFab, 1)} fab hrs</span>
            <span className="text-cyan-300">{fmtNum(grandTotals.totInst, 1)} inst hrs</span>
            <span className="text-green-400 font-bold text-base">{fmtDollar(grandTotals.rowTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StructuralTakeoff() {
  return <StructuralErrorBoundary><StructuralTakeoffInner /></StructuralErrorBoundary>;
}
