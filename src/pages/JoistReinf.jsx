import { useState, useMemo, useEffect } from 'react';
import { Grid3X3, Plus, Trash2, Copy, ChevronDown, ChevronUp, Info, Wrench } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

/* ââ Scrollbar + dark theme CSS injection ââ */
const SCROLLBAR_CSS = `
  .jr-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
  .jr-scroll::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
  .jr-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; border: 1px solid #334155; }
  .jr-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
  select option { background: #1e293b; color: #e2e8f0; }
`;

/* ââ Formatting helpers ââ */
const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = (v, d = 2) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ââ Bar weight lookup (lbs/ft) ââ */
const BAR_WEIGHTS = {
  '1/2': 0.67, '5/8': 1.04, '3/4': 1.50, '7/8': 2.05,
  '1': 2.67, '1-1/8': 3.38, '1-1/4': 4.18,
};
const BAR_SIZES = Object.keys(BAR_WEIGHTS);

/* ââ Common plate sizes (widthÃthickness â lbs/ft) ââ */
const PLATE_SIZES = [
  { label: 'PL 3Ã1/4', w: 3, t: 0.25 },
  { label: 'PL 3Ã3/8', w: 3, t: 0.375 },
  { label: 'PL 4Ã1/4', w: 4, t: 0.25 },
  { label: 'PL 4Ã3/8', w: 4, t: 0.375 },
  { label: 'PL 4Ã1/2', w: 4, t: 0.5 },
  { label: 'PL 6Ã1/4', w: 6, t: 0.25 },
  { label: 'PL 6Ã3/8', w: 6, t: 0.375 },
  { label: 'PL 6Ã1/2', w: 6, t: 0.5 },
  { label: 'PL 8Ã3/8', w: 8, t: 0.375 },
  { label: 'PL 8Ã1/2', w: 8, t: 0.5 },
  { label: 'PL 10Ã3/8', w: 10, t: 0.375 },
  { label: 'PL 10Ã1/2', w: 10, t: 0.5 },
  { label: 'Custom', w: 0, t: 0 },
];
const plateLbsPerFt = (w, t) => w * t * 3.4032;

/* ââ Angle sizes for web reinforcement (lbs/ft) ââ */
const ANGLE_SIZES = [
  { label: 'L1Ã1Ã1/8', lbsPerFt: 0.80 },
  { label: 'L1Ã1Ã3/16', lbsPerFt: 1.16 },
  { label: 'L1-1/4Ã1-1/4Ã1/8', lbsPerFt: 1.01 },
  { label: 'L1-1/2Ã1-1/2Ã1/8', lbsPerFt: 1.23 },
  { label: 'L1-1/2Ã1-1/2Ã3/16', lbsPerFt: 1.80 },
  { label: 'L2Ã2Ã1/8', lbsPerFt: 1.65 },
  { label: 'L2Ã2Ã3/16', lbsPerFt: 2.44 },
  { label: 'L2Ã2Ã1/4', lbsPerFt: 3.19 },
  { label: 'L2-1/2Ã2-1/2Ã1/8', lbsPerFt: 2.08 },
  { label: 'L2-1/2Ã2-1/2Ã3/16', lbsPerFt: 3.07 },
  { label: 'L2-1/2Ã2-1/2Ã1/4', lbsPerFt: 4.10 },
  { label: 'L3Ã3Ã3/16', lbsPerFt: 3.71 },
  { label: 'L3Ã3Ã1/4', lbsPerFt: 4.90 },
  { label: 'Custom', lbsPerFt: 0 },
];

/* ââ SJI Joist Types ââ */
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
  '52DLH10','52DLH11','52DLH12','52DLH13','52DLH14','52DLH15','52DLH16','52DLH17',
  '56DLH11','56DLH12','56DLH13','56DLH14','56DLH15','56DLH16','56DLH17',
  '60DLH12','60DLH13','60DLH14','60DLH15','60DLH16','60DLH17','60DLH18',
  '64DLH12','64DLH13','64DLH14','64DLH15','64DLH16','64DLH17','64DLH18',
  '68DLH14','68DLH15','68DLH16','68DLH17','68DLH18','68DLH19',
  '72DLH14','72DLH15','72DLH16','72DLH17','72DLH18','72DLH19',
];

/* ââ Reinforcement Methods ââ */
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

/* ââ Install/Fab rates from Rates & Config ââ */
const MATERIAL_MARKUP = 1.5;
const INSTALL_RATE = 110;
const FAB_RATE = 95;

/* ââ Default row factory ââ */
const defaultRow = () => ({
  id: crypto.randomUUID(),
  mark: '',
  location: '',
  joistType: '8K1',
  span: 0,
  reinfMethod: '2 Bars Top + Plate Bottom',
  qty: 1,
  // Chord
  chord_barsPerChord: 2,
  chord_topBarDia: '3/4',
  chord_topLbsPerFt: BAR_WEIGHTS['3/4'],
  chord_topLength: 0,
  chord_botType: 'plate',
  chord_botBarsPerChord: 2,
  chord_botBarDia: '3/4',
  chord_botPlateSize: 'PL 4Ã3/8',
  chord_botPlateW: 4,
  chord_botPlateT: 0.375,
  chord_botLbsPerFt: plateLbsPerFt(4, 0.375),
  chord_botLength: 0,
  chord_weldSpacing: 12,
  chord_weldSize: 3,
  chord_minPerWeld: 3,
  chord_crewSize: 2,
  // Web
  web_qtyPerJoist: 0,
  web_angleSize: 'L1-1/2Ã1-1/2Ã1/8',
  web_angleLbsPerFt: 1.23,
  web_vertQty: 0,
  web_vertLength: 0,
  web_vertLengthAuto: true,
  web_diagQty: 0,
  web_diagLength: 0,
  web_diagLengthAuto: true,
  web_minPerWeld: 5,
  notes: '',
});

/* ââ Calculations for a single JR row ââ */
function calcRow(r, rates = {}) {
  const installRate = rates.installRate ?? INSTALL_RATE;
  const fabRate = rates.fabRate ?? FAB_RATE;
  const qty = Number(r.qty) || 1;

  // CHORD calculations
  const topLen = Number(r.chord_topLength) || 0;
  const botLen = Number(r.chord_botLength) || 0;
  const bars = Number(r.chord_barsPerChord) || 0;
  const spacing = Number(r.chord_weldSpacing) || 12;
  const weldSize = Number(r.chord_weldSize) || 3;
  const chordMinPerWeld = Number(r.chord_minPerWeld) || 3;
  const crewSize = Number(r.chord_crewSize) || 2;
  const topLbs = Number(r.chord_topLbsPerFt) || 0;
  const botLbs = Number(r.chord_botLbsPerFt) || 0;

  const isBotBar = r.chord_botType === 'bar';
  const botBars = isBotBar ? (Number(r.chord_botBarsPerChord) || 2) : 1;

  // Top welds: ((topLen_ft Ã 12 / spacing) + 4 extra) Ã 2 sides Ã bars
  const topWelds = topLen > 0 ? Math.ceil(((topLen * 12) / spacing + 4) * 2 * bars) : 0;
  // Bottom welds: if bars â same formula as top (per bar, 2 sides); if plate â 2 continuous sides
  const botWelds = botLen > 0
    ? (isBotBar
        ? Math.ceil(((botLen * 12) / spacing + 4) * 2 * botBars)
        : Math.ceil(((botLen * 12) / spacing + 4) * 2))
    : 0;
  const chordTotalWelds = topWelds + botWelds;
  const chordWeldInches = chordTotalWelds * weldSize;
  const chordHrs = (chordTotalWelds * chordMinPerWeld) / 60;
  // Material: (topLbs Ã topLen Ã topBars + botLbs Ã botLen ï¿½ï¿½ botBars) Ã qty Ã markup
  const chordMaterial = (topLbs * topLen * bars + botLbs * botLen * botBars) * qty * MATERIAL_MARKUP;
  // Install: qty Ã hours Ã crewSize Ã rate + material
  const chordInstall = qty * chordHrs * crewSize * installRate + chordMaterial;

  // WEB calculations
  const webQty = Number(r.web_qtyPerJoist) || 0;
  const webLbs = Number(r.web_angleLbsPerFt) || 0;
  const joistDepthIn = parseInt(r.joistType) || 24;
  const vertQ = Number(r.web_vertQty) || 0;
  // Auto-calc vertical length from joist depth (in â ft) if auto mode, else manual
  const vertL = r.web_vertLengthAuto ? (joistDepthIn / 12) : (Number(r.web_vertLength) || 0);
  const diagQ = Number(r.web_diagQty) || 0;
  // Auto-calc diagonal length: hypotenuse based on depth and typical panel width (~depth)
  const diagL = r.web_diagLengthAuto ? (Math.sqrt(2) * joistDepthIn / 12) : (Number(r.web_diagLength) || 0);
  const webMinPerWeld = Number(r.web_minPerWeld) || 5;

  // Web welds: each member has 2 ends Ã 2 sides = 4 welds
  const webWelds = (vertQ * 4 + diagQ * 4);
  const webHrs = webQty > 0 ? (webQty * 0.5 + webQty * 4 * (webMinPerWeld / 60)) : 0;
  // Web material: (vertQÃvertL + diagQÃdiagL) Ã webLbs Ã 2sides Ã markup + clip angles
  const webMaterial = (qty * webLbs * vertQ * vertL + qty * webLbs * diagQ * diagL) * 2 * MATERIAL_MARKUP
    + qty * webQty * 1.7 * 4; // clip angle allowance
  const webInstall = qty * webHrs * 2 * installRate + webMaterial;

  // Totals
  const totalHrs = chordHrs + webHrs;
  const totalDays = totalHrs / 8;
  const totalWeeks = totalDays / 5;
  const totalMaterial = chordMaterial + webMaterial;
  const totalInstall = chordInstall + webInstall;
  const totalLabor = totalInstall - totalMaterial; // labor only (excl. material)
  const totalWeight = (topLbs * topLen * bars + botLbs * botLen * botBars
    + webLbs * (vertQ * vertL + diagQ * diagL) * 2) * qty;
  const perJoist = qty > 0 ? totalInstall / qty : 0;

  return {
    topWelds, botWelds, chordTotalWelds, chordWeldInches, chordHrs, chordMaterial, chordInstall,
    webWelds, webHrs, webMaterial, webInstall,
    totalHrs, totalDays, totalWeeks, totalMaterial, totalInstall, totalLabor, totalWeight, perJoist,
  };
}

/* ââ Reactive Cross-Section Diagram â Engineering Drawing Style ââ */
function JoistCrossSection({ row }) {
  const isBotBar = row.chord_botType === 'bar';
  const topBarCount = Math.min(Number(row.chord_barsPerChord) || 2, 4);
  const botBarCount = isBotBar ? Math.min(Number(row.chord_botBarsPerChord) || 2, 4) : 0;
  const method = row.reinfMethod || '';
  const hasWeb = (Number(row.web_vertQty) || 0) + (Number(row.web_diagQty) || 0) > 0;
  const depth = parseInt(row.joistType) || 24;
  const series = row.joistType?.match(/[A-Z]+/)?.[0] || 'K';

  const W = 520, H = 420, cX = 210;
  const scale = Math.min(220 / depth, 8);
  const jDepth = depth * scale;
  const topCY = (H - jDepth) / 2 + 30;
  const botCY = topCY + jDepth;

  // Engineering drawing colors
  const ink = '#1e293b';
  const thin = '#475569';
  const dimC = '#64748b';
  const fire = '#dc2626';
  const blue = '#2563eb';
  const weldC = '#059669';
  const green = '#16a34a';

  // Chord angle geometry
  const aLeg = Math.max(14, Math.min(24, depth * 0.6));
  const aT = Math.max(3.5, aLeg * 0.2);
  const gap = 4;
  const tcLx = cX - gap / 2;
  const tcRx = cX + gap / 2;

  // Web member geometry
  const webLeg = Math.max(10, aLeg * 0.55);
  const webT = Math.max(2.5, webLeg * 0.18);

  // Determine reinforcement types per method
  const topType = method.includes('Bars Top') ? 'bar'
    : method.includes('Angle') ? 'angle'
    : method.includes('Channel') ? 'channel'
    : method.includes('HSS') ? 'hss'
    : method.includes('Splice') || method === 'Full Replacement' ? 'splice'
    : 'bar';

  const botType = method.includes('Plate') ? 'plate'
    : method.includes('2 Bars Bot') || method.includes('Bars Bottom') ? 'bar'
    : method.includes('Channel') ? 'channel'
    : method.includes('HSS') ? 'hss'
    : method.includes('Splice') || method === 'Full Replacement' ? 'splice'
    : isBotBar ? 'bar' : 'plate';

  // Reinforcement bar positions
  const barR = Math.max(5, Math.min(8, depth * 0.22));
  const barSpacing = barR * 3.2;

  const topBars = [];
  if (topType === 'bar') {
    for (let i = 0; i < topBarCount; i++) {
      const startX = cX - ((topBarCount - 1) * barSpacing) / 2;
      topBars.push({ cx: startX + i * barSpacing, cy: topCY - aLeg - barR - 4 });
    }
  }

  const botBars = [];
  if (botType === 'bar') {
    for (let i = 0; i < botBarCount; i++) {
      const startX = cX - ((botBarCount - 1) * barSpacing) / 2;
      botBars.push({ cx: startX + i * barSpacing, cy: botCY + aLeg + barR + 4 });
    }
  }

  const botPlateW = botType === 'plate' ? Math.max(24, (Number(row.chord_botPlateW) || 4) * 5) : 0;
  const botPlateT = botType === 'plate' ? Math.max(4, (Number(row.chord_botPlateT) || 0.25) * 12) : 0;

  const reinfALeg = Math.max(12, aLeg * 0.75);
  const reinfAT = Math.max(3, reinfALeg * 0.18);

  // Channel dims
  const chW = Math.max(12, aLeg * 0.6);
  const chH = Math.max(20, aLeg * 1.2);
  const chT = Math.max(2.5, chW * 0.2);
  const chFl = Math.max(5, chW * 0.45);

  // HSS dims
  const hssW = Math.max(14, aLeg * 0.7);
  const hssH = Math.max(18, aLeg * 1.0);
  const hssT = Math.max(2.5, hssW * 0.15);

  // Helper: draw one L-angle cross-section with hatching
  const AngleL = ({ x, y, leg, t, flipH, flipV, color, opacity, hatch }) => {
    const sX = flipH ? -1 : 1;
    const sY = flipV ? -1 : 1;
    const id = `h${x}${y}${flipH}${flipV}`.replace(/[^a-zA-Z0-9]/g, '');
    return (
      <g>
        {hatch && (
          <defs>
            <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke={color} strokeWidth="0.4" opacity="0.4" />
            </pattern>
          </defs>
        )}
        <path
          d={`M ${x},${y} l ${sX * t},0 l 0,${sY * (leg - t)} l ${sX * (leg - t)},0 l 0,${sY * t} l ${sX * -(leg)},0 Z`}
          fill={hatch ? `url(#${id})` : color} opacity={opacity || 0.85} stroke={color} strokeWidth="1"
        />
      </g>
    );
  };

  // Helper: AWS fillet weld symbol
  const WeldSymbol = ({ x, y, toX, toY, label, side = 'arrow' }) => {
    const refLen = 50;
    return (
      <g>
        {/* Arrow line from joint to reference line */}
        <line x1={x} y1={y} x2={toX} y2={toY} stroke={weldC} strokeWidth="0.8" />
        {/* Arrowhead */}
        <circle cx={x} cy={y} r="1.5" fill={weldC} />
        {/* Reference line */}
        <line x1={toX} y1={toY} x2={toX + refLen} y2={toY} stroke={weldC} strokeWidth="0.8" />
        {/* Fillet weld triangle (below ref line = arrow side, above = other side) */}
        {side === 'arrow' ? (
          <polygon points={`${toX + 4},${toY} ${toX + 12},${toY} ${toX + 4},${toY + 8}`} fill="none" stroke={weldC} strokeWidth="0.8" />
        ) : (
          <polygon points={`${toX + 4},${toY} ${toX + 12},${toY} ${toX + 12},${toY - 8}`} fill="none" stroke={weldC} strokeWidth="0.8" />
        )}
        {/* Label text */}
        {label && <text x={toX + 16} y={side === 'arrow' ? toY - 3 : toY + 10} fill={weldC} fontSize="7" fontFamily="monospace" fontWeight="bold">{label}</text>}
      </g>
    );
  };

  // Helper: dimension line
  const DimLine = ({ x1: dx1, y1: dy1, x2: dx2, y2: dy2, label, offset = 0 }) => {
    const isVert = Math.abs(dx1 - dx2) < 2;
    const tickL = 4;
    const mx = (dx1 + dx2) / 2 + offset;
    const my = (dy1 + dy2) / 2;
    return (
      <g>
        <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke={dimC} strokeWidth="0.6" />
        {isVert ? (
          <>
            <line x1={dx1 - tickL} y1={dy1} x2={dx1 + tickL} y2={dy1} stroke={dimC} strokeWidth="0.6" />
            <line x1={dx2 - tickL} y1={dy2} x2={dx2 + tickL} y2={dy2} stroke={dimC} strokeWidth="0.6" />
            <text x={mx - 2} y={my + 3} textAnchor="middle" fill={dimC} fontSize="8" fontFamily="monospace"
              transform={`rotate(-90, ${mx - 2}, ${my})`}>{label}</text>
          </>
        ) : (
          <>
            <line x1={dx1} y1={dy1 - tickL} x2={dx1} y2={dy1 + tickL} stroke={dimC} strokeWidth="0.6" />
            <line x1={dx2} y1={dy2 - tickL} x2={dx2} y2={dy2 + tickL} stroke={dimC} strokeWidth="0.6" />
            <text x={mx} y={my - 4} textAnchor="middle" fill={dimC} fontSize="8" fontFamily="monospace">{label}</text>
          </>
        )}
      </g>
    );
  };

  // Right-side annotation panel X start
  const annoX = cX + aLeg + 50;

  return (
    <div className="rounded-lg border-2 border-steel-700 bg-white p-3 shadow-lg">
      {/* Drawing header bar */}
      <div className="flex items-center justify-between mb-1 pb-1 border-b border-steel-200">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-steel-500">SECTION A-A</span>
          <span className="text-[10px] text-steel-400">|</span>
          <span className="text-[10px] font-mono text-steel-500">{row.joistType}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-fire-500 font-semibold">{method}</span>
          <span className="text-[10px] text-steel-400 font-mono">NTS</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto" style={{ height: 'auto', maxWidth: '520px' }}>
        {/* Drawing border */}
        <rect x="2" y="2" width={W - 4} height={H - 4} fill="none" stroke={ink} strokeWidth="1.5" />
        <rect x="5" y="5" width={W - 10} height={H - 10} fill="none" stroke={thin} strokeWidth="0.3" />

        {/* CENTER LINE (chain-dash) */}
        <line x1={cX} y1={25} x2={cX} y2={H - 40} stroke={dimC} strokeWidth="0.4" strokeDasharray="8,3,2,3" />
        <text x={cX + 3} y={30} fill={dimC} fontSize="6" fontFamily="monospace">CL</text>

        {/* === TOP CHORD â double angle back-to-back with hatching === */}
        <AngleL x={tcLx} y={topCY} leg={aLeg} t={aT} flipH={true} flipV={true} color={ink} hatch={true} />
        <AngleL x={tcRx} y={topCY} leg={aLeg} t={aT} flipH={false} flipV={true} color={ink} hatch={true} />

        {/* === BOTTOM CHORD â double angle back-to-back with hatching === */}
        <AngleL x={tcLx} y={botCY} leg={aLeg} t={aT} flipH={true} flipV={false} color={ink} hatch={true} />
        <AngleL x={tcRx} y={botCY} leg={aLeg} t={aT} flipH={false} flipV={false} color={ink} hatch={true} />

        {/* === WEB MEMBER â single angle between chords === */}
        {hasWeb && (
          <g>
            <AngleL x={cX - webT / 2} y={(topCY + botCY) / 2 - webLeg / 2} leg={webLeg} t={webT} flipH={false} flipV={false} color={green} hatch={true} opacity={0.7} />
            {/* Leader to web */}
            <line x1={cX + webLeg + 4} y1={(topCY + botCY) / 2} x2={annoX - 4} y2={(topCY + botCY) / 2} stroke={thin} strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={annoX} y={(topCY + botCY) / 2 - 2} fill={green} fontSize="7.5" fontFamily="monospace" fontWeight="bold">WEB MEMBER</text>
            <text x={annoX} y={(topCY + botCY) / 2 + 8} fill={dimC} fontSize="6.5" fontFamily="monospace">{row.web_angleSize}</text>
          </g>
        )}

        {/* === DEPTH DIMENSION LINE (left side) === */}
        <DimLine x1={cX - aLeg - 36} y1={topCY} x2={cX - aLeg - 36} y2={botCY} label={`${depth}"`} />
        {/* Extension lines */}
        <line x1={cX - aLeg - 2} y1={topCY} x2={cX - aLeg - 40} y2={topCY} stroke={dimC} strokeWidth="0.3" />
        <line x1={cX - aLeg - 2} y1={botCY} x2={cX - aLeg - 40} y2={botCY} stroke={dimC} strokeWidth="0.3" />

        {/* === LEADER: TOP CHORD LABEL === */}
        <line x1={cX + aLeg + 4} y1={topCY - aLeg / 2} x2={annoX - 4} y2={topCY - aLeg / 2} stroke={thin} strokeWidth="0.5" />
        <circle cx={cX + aLeg + 4} cy={topCY - aLeg / 2} r="1" fill={ink} />
        <text x={annoX} y={topCY - aLeg / 2 - 2} fill={ink} fontSize="7.5" fontFamily="monospace" fontWeight="bold">TOP CHORD</text>
        <text x={annoX} y={topCY - aLeg / 2 + 8} fill={dimC} fontSize="6.5" fontFamily="monospace">2L back-to-back</text>

        {/* === LEADER: BOTTOM CHORD LABEL === */}
        <line x1={cX + aLeg + 4} y1={botCY + aLeg / 2} x2={annoX - 4} y2={botCY + aLeg / 2} stroke={thin} strokeWidth="0.5" />
        <circle cx={cX + aLeg + 4} cy={botCY + aLeg / 2} r="1" fill={ink} />
        <text x={annoX} y={botCY + aLeg / 2 - 2} fill={ink} fontSize="7.5" fontFamily="monospace" fontWeight="bold">BOT CHORD</text>
        <text x={annoX} y={botCY + aLeg / 2 + 8} fill={dimC} fontSize="6.5" fontFamily="monospace">2L back-to-back</text>

        {/* === TOP REINFORCEMENT â method-reactive === */}
        {topType === 'bar' && (
          <g>
            {topBars.map((b, i) => (
              <g key={`tb${i}`}>
                <circle cx={b.cx} cy={b.cy} r={barR} fill="none" stroke={fire} strokeWidth="1.8" />
                <line x1={b.cx - barR * 0.6} y1={b.cy - barR * 0.6} x2={b.cx + barR * 0.6} y2={b.cy + barR * 0.6} stroke={fire} strokeWidth="0.8" />
                <line x1={b.cx + barR * 0.6} y1={b.cy - barR * 0.6} x2={b.cx - barR * 0.6} y2={b.cy + barR * 0.6} stroke={fire} strokeWidth="0.8" />
              </g>
            ))}
            {/* Weld callouts for top bars */}
            {topBars.length > 0 && (
              <WeldSymbol x={topBars[0].cx} y={topBars[0].cy + barR + 2}
                toX={cX - aLeg - 50} toY={topBars[0].cy + barR + 16}
                label={`WELD E/S @ ${row.chord_weldSpacing || 12}" O.C.`} side="arrow" />
            )}
            {/* Leader to annotation panel */}
            {topBars.length > 0 && (
              <g>
                <line x1={topBars[topBars.length - 1].cx + barR + 2} y1={topBars[0].cy} x2={annoX - 4} y2={topBars[0].cy} stroke={thin} strokeWidth="0.5" strokeDasharray="2,2" />
                <text x={annoX} y={topBars[0].cy - 3} fill={fire} fontSize="7.5" fontFamily="monospace" fontWeight="bold">TOP REINF.</text>
                <text x={annoX} y={topBars[0].cy + 7} fill={dimC} fontSize="6.5" fontFamily="monospace">{topBarCount}x {row.chord_topBarDia}" RD. BAR</text>
                <text x={annoX} y={topBars[0].cy + 16} fill={dimC} fontSize="6" fontFamily="monospace">L = {row.chord_topLength || 'â'} ft</text>
              </g>
            )}
          </g>
        )}
        {topType === 'angle' && (
          <g>
            <AngleL x={cX - gap / 2 - reinfALeg - 2} y={topCY - aLeg} leg={reinfALeg} t={reinfAT} flipH={false} flipV={true} color={fire} hatch={true} opacity={0.75} />
            <AngleL x={cX + gap / 2 + reinfALeg + 2} y={topCY - aLeg} leg={reinfALeg} t={reinfAT} flipH={true} flipV={true} color={fire} hatch={true} opacity={0.75} />
            <WeldSymbol x={cX - gap / 2 - 1} y={topCY - aLeg} toX={annoX - 4} toY={topCY - aLeg - 12} label="WELD E/S" side="arrow" />
            <text x={annoX} y={topCY - aLeg + 4} fill={fire} fontSize="7.5" fontFamily="monospace" fontWeight="bold">REINF. ANGLES</text>
          </g>
        )}
        {topType === 'channel' && (
          <g>
            <path d={`M ${cX - aLeg - 8},${topCY - chH / 2} l ${chFl},0 l 0,${chT} l ${-(chFl - chT)},0 l 0,${chH - 2 * chT} l ${chFl - chT},0 l 0,${chT} l ${-chFl},0 Z`}
              fill="none" stroke={fire} strokeWidth="1.5" />
            {/* Hatching inside channel */}
            <line x1={cX - aLeg - 8 + chT} y1={topCY - chH / 2 + chT + 2} x2={cX - aLeg - 8 + chFl - 1} y2={topCY - chH / 2 + chT + 2} stroke={fire} strokeWidth="0.3" opacity="0.4" />
            <WeldSymbol x={cX - aLeg - 8 + chFl} y={topCY} toX={cX - aLeg - 60} toY={topCY - 14} label="WELD E/S" />
            <line x1={cX - aLeg - 8} y1={topCY} x2={cX - aLeg - 60} y2={topCY + 10} stroke={thin} strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={cX - aLeg - 110} y={topCY + 10} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="end">C-CHANNEL</text>
          </g>
        )}
        {topType === 'hss' && (
          <g>
            <rect x={cX - aLeg - hssW - 8} y={topCY - hssH / 2} width={hssW} height={hssH} rx="1" fill="none" stroke={fire} strokeWidth="2" />
            <rect x={cX - aLeg - hssW - 8 + hssT} y={topCY - hssH / 2 + hssT} width={hssW - 2 * hssT} height={hssH - 2 * hssT} rx="0.5" fill="none" stroke={fire} strokeWidth="0.5" strokeDasharray="2,2" />
            <WeldSymbol x={cX - aLeg - 8} y={topCY} toX={cX - aLeg - 60} toY={topCY - 14} label="WELD/BOLT" />
            <text x={cX - aLeg - hssW / 2 - 8} y={topCY + 3} fill={fire} fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">HSS</text>
          </g>
        )}
        {topType === 'splice' && (
          <g>
            <rect x={cX - aLeg - 10} y={topCY - aLeg + 2} width={5} height={aLeg * 1.5} rx="0.5" fill="none" stroke={fire} strokeWidth="1.5" />
            <rect x={cX + aLeg + 5} y={topCY - aLeg + 2} width={5} height={aLeg * 1.5} rx="0.5" fill="none" stroke={fire} strokeWidth="1.5" />
            {/* Hatching on splice plates */}
            {[0, 3, 6, 9].map(dy => (
              <g key={`sph${dy}`}>
                <line x1={cX - aLeg - 10} y1={topCY - aLeg + 4 + dy} x2={cX - aLeg - 5} y2={topCY - aLeg + 4 + dy} stroke={fire} strokeWidth="0.3" opacity="0.5" />
                <line x1={cX + aLeg + 5} y1={topCY - aLeg + 4 + dy} x2={cX + aLeg + 10} y2={topCY - aLeg + 4 + dy} stroke={fire} strokeWidth="0.3" opacity="0.5" />
              </g>
            ))}
            <text x={annoX} y={topCY - aLeg / 2 - 14} fill={fire} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
              {method.includes('Bolted') ? 'BOLTED' : method.includes('Welded') ? 'WELDED' : 'FULL'} SPLICE
            </text>
            {method.includes('Bolted') ? (
              <>
                {[topCY - aLeg / 2, topCY + 2].map((cy, i) => (
                  <g key={`bolt${i}`}>
                    <circle cx={cX - aLeg - 7.5} cy={cy} r="2.5" fill="none" stroke={fire} strokeWidth="0.8" />
                    <line x1={cX - aLeg - 9} y1={cy - 1.5} x2={cX - aLeg - 6} y2={cy + 1.5} stroke={fire} strokeWidth="0.5" />
                    <circle cx={cX + aLeg + 7.5} cy={cy} r="2.5" fill="none" stroke={fire} strokeWidth="0.8" />
                    <line x1={cX + aLeg + 6} y1={cy - 1.5} x2={cX + aLeg + 9} y2={cy + 1.5} stroke={fire} strokeWidth="0.5" />
                  </g>
                ))}
              </>
            ) : (
              <>
                <WeldSymbol x={cX - aLeg - 5} y={topCY - 2} toX={annoX - 4} toY={topCY - aLeg / 2 - 4} label="WELD E/S" />
              </>
            )}
          </g>
        )}

        {/* === BOTTOM REINFORCEMENT â method-reactive === */}
        {botType === 'bar' && (
          <g>
            {botBars.map((b, i) => (
              <g key={`bb${i}`}>
                <circle cx={b.cx} cy={b.cy} r={barR} fill="none" stroke={blue} strokeWidth="1.8" />
                <line x1={b.cx - barR * 0.6} y1={b.cy - barR * 0.6} x2={b.cx + barR * 0.6} y2={b.cy + barR * 0.6} stroke={blue} strokeWidth="0.8" />
                <line x1={b.cx + barR * 0.6} y1={b.cy - barR * 0.6} x2={b.cx - barR * 0.6} y2={b.cy + barR * 0.6} stroke={blue} strokeWidth="0.8" />
              </g>
            ))}
            {botBars.length > 0 && (
              <g>
                <WeldSymbol x={botBars[0].cx} y={botBars[0].cy - barR - 2}
                  toX={cX - aLeg - 50} toY={botBars[0].cy - barR - 16}
                  label={`WELD E/S @ ${row.chord_weldSpacing || 12}" O.C.`} side="arrow" />
                <line x1={botBars[botBars.length - 1].cx + barR + 2} y1={botBars[0].cy} x2={annoX - 4} y2={botBars[0].cy} stroke={thin} strokeWidth="0.5" strokeDasharray="2,2" />
                <text x={annoX} y={botBars[0].cy - 3} fill={blue} fontSize="7.5" fontFamily="monospace" fontWeight="bold">BOT REINF.</text>
                <text x={annoX} y={botBars[0].cy + 7} fill={dimC} fontSize="6.5" fontFamily="monospace">{botBarCount}x {row.chord_botBarDia}" RD. BAR</text>
                <text x={annoX} y={botBars[0].cy + 16} fill={dimC} fontSize="6" fontFamily="monospace">L = {row.chord_botLength || 'â'} ft</text>
              </g>
            )}
          </g>
        )}
        {botType === 'plate' && (
          <g>
            <rect x={cX - botPlateW / 2} y={botCY + aT + 3} width={botPlateW} height={botPlateT} rx="0.5" fill="none" stroke={blue} strokeWidth="1.5" />
            {/* Hatching inside plate */}
            {Array.from({ length: Math.floor(botPlateW / 3) }, (_, i) => (
              <line key={`ph${i}`} x1={cX - botPlateW / 2 + 2 + i * 3} y1={botCY + aT + 3} x2={cX - botPlateW / 2 + 2 + i * 3} y2={botCY + aT + 3 + botPlateT} stroke={blue} strokeWidth="0.3" opacity="0.4" />
            ))}
            {/* Weld symbols at each side of plate */}
            <WeldSymbol x={cX - botPlateW / 2} y={botCY + aT + 2}
              toX={cX - aLeg - 50} toY={botCY + aT + 20}
              label="WELD ALONG E/S" side="arrow" />
            {/* Plate dimension */}
            <DimLine x1={cX - botPlateW / 2} y1={botCY + aT + 3 + botPlateT + 12}
              x2={cX + botPlateW / 2} y2={botCY + aT + 3 + botPlateT + 12}
              label={row.chord_botPlateSize} />
            {/* Leader to annotation */}
            <line x1={cX + botPlateW / 2 + 2} y1={botCY + aT + 3 + botPlateT / 2} x2={annoX - 4} y2={botCY + aT + 3 + botPlateT / 2} stroke={thin} strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={annoX} y={botCY + aT - 1} fill={blue} fontSize="7.5" fontFamily="monospace" fontWeight="bold">BOT REINF. PLATE</text>
            <text x={annoX} y={botCY + aT + 9} fill={dimC} fontSize="6.5" fontFamily="monospace">{row.chord_botPlateSize}</text>
            <text x={annoX} y={botCY + aT + 18} fill={dimC} fontSize="6" fontFamily="monospace">L = {row.chord_botLength || 'â'} ft</text>
          </g>
        )}
        {botType === 'channel' && (
          <g>
            <path d={`M ${cX + aLeg + 8 + chFl},${botCY - chH / 2} l ${-chFl},0 l 0,${chT} l ${chFl - chT},0 l 0,${chH - 2 * chT} l ${-(chFl - chT)},0 l 0,${chT} l ${chFl},0 Z`}
              fill="none" stroke={blue} strokeWidth="1.5" />
            <WeldSymbol x={cX + aLeg + 8} y={botCY} toX={annoX} toY={botCY + 16} label="WELD E/S" />
            <text x={annoX} y={botCY - 4} fill={blue} fontSize="7.5" fontFamily="monospace" fontWeight="bold">C-CHANNEL</text>
          </g>
        )}
        {botType === 'hss' && (
          <g>
            <rect x={cX + aLeg + 8} y={botCY - hssH / 2} width={hssW} height={hssH} rx="1" fill="none" stroke={blue} strokeWidth="2" />
            <rect x={cX + aLeg + 8 + hssT} y={botCY - hssH / 2 + hssT} width={hssW - 2 * hssT} height={hssH - 2 * hssT} rx="0.5" fill="none" stroke={blue} strokeWidth="0.5" strokeDasharray="2,2" />
            <WeldSymbol x={cX + aLeg + 8} y={botCY} toX={annoX} toY={botCY + 16} label="WELD/BOLT" />
            <text x={cX + aLeg + 8 + hssW / 2} y={botCY + 3} fill={blue} fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">HSS</text>
          </g>
        )}
        {botType === 'splice' && (
          <g>
            <rect x={cX - aLeg - 10} y={botCY - aLeg * 0.25} width={5} height={aLeg * 1.5} rx="0.5" fill="none" stroke={blue} strokeWidth="1.5" />
            <rect x={cX + aLeg + 5} y={botCY - aLeg * 0.25} width={5} height={aLeg * 1.5} rx="0.5" fill="none" stroke={blue} strokeWidth="1.5" />
            {method.includes('Bolted') ? (
              <>
                {[botCY, botCY + aLeg / 2].map((cy, i) => (
                  <g key={`bbolt${i}`}>
                    <circle cx={cX - aLeg - 7.5} cy={cy} r="2.5" fill="none" stroke={blue} strokeWidth="0.8" />
                    <line x1={cX - aLeg - 9} y1={cy - 1.5} x2={cX - aLeg - 6} y2={cy + 1.5} stroke={blue} strokeWidth="0.5" />
                    <circle cx={cX + aLeg + 7.5} cy={cy} r="2.5" fill="none" stroke={blue} strokeWidth="0.8" />
                    <line x1={cX + aLeg + 6} y1={cy - 1.5} x2={cX + aLeg + 9} y2={cy + 1.5} stroke={blue} strokeWidth="0.5" />
                  </g>
                ))}
              </>
            ) : (
              <WeldSymbol x={cX - aLeg - 5} y={botCY} toX={cX - aLeg - 60} toY={botCY + 14} label="WELD E/S" />
            )}
          </g>
        )}

        {/* === TITLE BLOCK (bottom) === */}
        <rect x="8" y={H - 36} width={W - 16} height="28" rx="0" fill="#f8fafc" stroke={ink} strokeWidth="0.8" />
        <line x1={W / 2} y1={H - 36} x2={W / 2} y2={H - 8} stroke={thin} strokeWidth="0.3" />
        <text x="16" y={H - 22} fill={ink} fontSize="9" fontFamily="monospace" fontWeight="bold">
          SECTION A-A: {row.joistType} â {series === 'K' ? 'STANDARD' : series === 'LH' ? 'LONG SPAN' : 'DEEP LONG SPAN'}
        </text>
        <text x="16" y={H - 12} fill={dimC} fontSize="7" fontFamily="monospace">
          REINF: {method.toUpperCase()} | SCALE: NTS | REV: â
        </text>
        <text x={W / 2 + 8} y={H - 22} fill={ink} fontSize="7" fontFamily="monospace" fontWeight="bold">TRIPLE WELD INC.</text>
        <text x={W / 2 + 8} y={H - 12} fill={dimC} fontSize="6.5" fontFamily="monospace">CWB W47.1 / W59 | CSA S16-19</text>

        {/* Legend strip */}
        <g transform={`translate(8, ${H - 56})`}>
          <rect x="0" y="0" width={W - 16} height="16" rx="0" fill="#f8fafc" stroke={thin} strokeWidth="0.3" />
          <circle cx="12" cy="8" r="3.5" fill="none" stroke={fire} strokeWidth="1.2" />
          <line x1="10" y1="6" x2="14" y2="10" stroke={fire} strokeWidth="0.6" />
          <text x="20" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Top Reinf.</text>
          {botType === 'plate' ? (
            <><rect x="72" y="5" width="10" height="4" fill="none" stroke={blue} strokeWidth="1" /><text x="86" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Bot Plate</text></>
          ) : (
            <><circle cx="78" cy="8" r="3.5" fill="none" stroke={blue} strokeWidth="1.2" /><text x="86" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Bot Reinf.</text></>
          )}
          <rect x="136" y="4" width="6" height="8" fill="none" stroke={ink} strokeWidth="1" />
          <text x="146" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Chord 2L</text>
          {hasWeb && (<><rect x="194" y="4" width="6" height="8" fill="none" stroke={green} strokeWidth="1" /><text x="204" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Web</text></>)}
          <line x1="235" y1="5" x2="242" y2="11" stroke={weldC} strokeWidth="1" />
          <polygon points="235,5 237,8 233,8" fill={weldC} />
          <text x="248" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Weld Symbol</text>
          <line x1="310" y1="8" x2="330" y2="8" stroke={dimC} strokeWidth="0.5" />
          <line x1="310" y1="5" x2="310" y2="11" stroke={dimC} strokeWidth="0.5" />
          <line x1="330" y1="5" x2="330" y2="11" stroke={dimC} strokeWidth="0.5" />
          <text x="336" y="11" fill={dimC} fontSize="6" fontFamily="monospace">Dimension</text>
        </g>
      </svg>
    </div>
  );
}

/* ââ Info Legend (collapsible) ââ */
function JoistInfoLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-xl border border-silver-200 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-steel-50 transition-colors">
        <Info className="h-4 w-4 text-fire-500" />
        <span className="text-sm font-semibold text-steel-700">Reference Guide: Joist Types & Reinforcement Methods</span>
        <span className="ml-auto">{open ? <ChevronUp className="h-4 w-4 text-silver-400" /> : <ChevronDown className="h-4 w-4 text-silver-400" />}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-silver-100">
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-steel-700 mb-2">SJI Joist Type Nomenclature</h4>
              <p className="text-xs text-silver-500 mb-2">Format: <span className="font-mono">[Depth]</span><span className="text-fire-500 font-mono">[Series]</span><span className="text-blue-500 font-mono">[Chord #]</span></p>
              <table className="w-full text-xs"><thead><tr className="border-b border-silver-200"><th className="py-1 text-left font-semibold">Series</th><th className="py-1 text-left">Name</th><th className="py-1 text-left">Depth</th><th className="py-1 text-left">Typical Span</th></tr></thead><tbody>
                <tr><td className="py-0.5 text-fire-500 font-bold">K</td><td>Standard</td><td>8" - 30"</td><td>8 - 60 ft</td></tr>
                <tr><td className="py-0.5 text-fire-500 font-bold">LH</td><td>Long Span</td><td>18" - 48"</td><td>25 - 96 ft</td></tr>
                <tr><td className="py-0.5 text-fire-500 font-bold">DLH</td><td>Deep Long Span</td><td>52" - 72"</td><td>60 - 144 ft</td></tr>
              </tbody></table>
              <p className="text-[10px] text-silver-400 mt-2">Chord # = size of top/bottom chords. Higher number = heavier chords = more load capacity.</p>
              <p className="text-[10px] text-silver-400">Example: <span className="font-mono text-steel-600">24K8</span> = 24" deep, K-series, chord size 8 (medium-heavy, ~30-45 ft spans).</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-steel-700 mb-2">Reinforcement Methods</h4>
              <table className="w-full text-xs"><thead><tr className="border-b border-silver-200"><th className="py-1 text-left font-semibold">Method</th><th className="py-1 text-left">Description</th></tr></thead><tbody>
                <tr><td className="py-0.5 text-fire-500 font-semibold">2 Bars Top + Plate Bot</td><td>Two round bars welded to top chord + steel plate welded to bottom chord. Most common method.</td></tr>
                <tr><td className="py-0.5 text-fire-500 font-semibold">2 Bars Top + 2 Bars Bot</td><td>Two round bars on each chord (top and bottom). Used when both chords need reinforcement.</td></tr>
                <tr><td className="py-0.5">Angle + Plate</td><td>Steel angle on top chord + plate on bottom. Traditional method for moderate loads.</td></tr>
                <tr><td className="py-0.5">Channel Reinf.</td><td>C-channel sistered alongside joist chords. Good for heavier load increases.</td></tr>
                <tr><td className="py-0.5">HSS Strongback</td><td>HSS tube bolted/welded alongside joist. For significant load upgrades or point loads.</td></tr>
              </tbody></table>
              <p className="text-[10px] text-silver-400 mt-2">Standards: SJI Technical Digest #2 (Reinforcement), CSA S16-19. All reinforcement designs require PE stamp.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ââ Expandable JR Block Row ââ */
function JRBlock({ row, index, onUpdate, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(false);
  const labourRates = state.rates?.labourRates || {};
  const calc = useMemo(() => calcRow(row, labourRates), [row, labourRates]);

  const set = (field, value) => onUpdate(row.id, field, value);
  const setNum = (field, val) => set(field, parseFloat(val) || 0);
  const setInt = (field, val) => set(field, parseInt(val) || 0);

  // When bar diameter changes, auto-update lbs/ft
  const setTopBarDia = (dia) => { set('chord_topBarDia', dia); set('chord_topLbsPerFt', BAR_WEIGHTS[dia] || 0); };
  const setBotBarDia = (dia) => { set('chord_botBarDia', dia); set('chord_botLbsPerFt', BAR_WEIGHTS[dia] || 0); };
  const setWebAngle = (label) => {
    const a = ANGLE_SIZES.find(x => x.label === label) || ANGLE_SIZES[0];
    set('web_angleSize', label);
    set('web_angleLbsPerFt', a.lbsPerFt);
  };

  // When plate size changes
  const setBotPlate = (label) => {
    const p = PLATE_SIZES.find(x => x.label === label) || PLATE_SIZES[0];
    set('chord_botPlateSize', label);
    set('chord_botPlateW', p.w);
    set('chord_botPlateT', p.t);
    set('chord_botLbsPerFt', p.w > 0 ? plateLbsPerFt(p.w, p.t) : 0);
  };

  // When reinf method changes, auto-set bot type + defaults
  const setReinfMethod = (method) => {
    set('reinfMethod', method);
    if (method.includes('2 Bars') && method.includes('2 Bars Bot')) {
      set('chord_botType', 'bar');
      set('chord_botBarsPerChord', 2);
      set('chord_botLbsPerFt', BAR_WEIGHTS[row.chord_botBarDia] || BAR_WEIGHTS['3/4']);
    } else if (method.includes('Plate')) {
      set('chord_botType', 'plate');
      const p = PLATE_SIZES.find(x => x.label === row.chord_botPlateSize) || PLATE_SIZES[3];
      set('chord_botLbsPerFt', p.w > 0 ? plateLbsPerFt(p.w, p.t) : 0);
    }
  };

  const isBotBar = row.chord_botType === 'bar';
  // Dark-themed input classes for expanded detail section
  const inCls = 'w-full bg-steel-700 border border-steel-600 px-2 py-1.5 text-xs font-mono text-right text-white placeholder:text-silver-500 focus:outline-none focus:ring-1 focus:ring-fire-500 focus:border-fire-500 rounded';
  const inTxtCls = 'w-full bg-steel-700 border border-steel-600 px-2 py-1.5 text-xs font-mono text-left text-white placeholder:text-silver-500 focus:outline-none focus:ring-1 focus:ring-fire-500 focus:border-fire-500 rounded';
  const selCls = 'w-full bg-steel-700 border border-steel-600 px-2 py-1.5 text-xs font-mono text-left text-white focus:outline-none focus:ring-1 focus:ring-fire-500 focus:border-fire-500 rounded cursor-pointer';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-wide text-silver-300';

  return (
    <div className="border border-steel-700 rounded-lg mb-3 bg-steel-800 shadow-sm overflow-hidden">
      {/* ââ Main Row (always visible) ââ */}
      <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${expanded ? 'bg-steel-900 text-white' : 'text-silver-200 hover:bg-steel-700'}`}
        onClick={() => setExpanded(!expanded)}>
        <span className="w-8 text-center text-xs font-mono font-bold opacity-60">{index + 1}</span>
        <div className="flex-1 grid grid-cols-8 gap-2 items-center" onClick={e => e.stopPropagation()}>
          <input type="text" value={row.mark} onChange={e => set('mark', e.target.value)} placeholder="JR-01"
            className={`${inTxtCls} ${expanded ? 'text-white placeholder:text-silver-400' : ''}`} />
          <input type="text" value={row.location} onChange={e => set('location', e.target.value)} placeholder="Grid B-3"
            className={`${inTxtCls} ${expanded ? 'text-white placeholder:text-silver-400' : ''}`} />
          <select value={row.joistType} onChange={e => set('joistType', e.target.value)}
            className={`${selCls} ${expanded ? 'text-white' : ''}`}>
            <optgroup label="K-Series (Standard)">{K_SERIES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
            <optgroup label="LH-Series (Long Span)">{LH_SERIES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
            <optgroup label="DLH-Series (Deep Long Span)">{DLH_SERIES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
            <optgroup label="Other"><option value="KCS">KCS</option><option value="CJ">CJ</option><option value="Custom">Custom</option></optgroup>
          </select>
          <input type="number" min="0" step="0.5" value={row.span || ''} onChange={e => setNum('span', e.target.value)}
            placeholder="ft" className={`${inCls} ${expanded ? 'text-white' : ''}`} />
          <select value={row.reinfMethod} onChange={e => setReinfMethod(e.target.value)}
            className={`${selCls} col-span-2 ${expanded ? 'text-white' : ''}`}>
            {REINF_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="number" min="1" value={row.qty || ''} onChange={e => setInt('qty', e.target.value)}
            className={`${inCls} ${expanded ? 'text-white' : ''}`} />
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-3 text-xs font-mono whitespace-nowrap">
          <span className={expanded ? 'text-fire-400' : 'text-steel-600'}>{fmtDec(calc.totalHrs, 1)}h</span>
          <span className={expanded ? 'text-fire-400' : 'text-fire-600 font-bold'}>{fmt(calc.perJoist)}/jst</span>
        </div>
        <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => onDuplicate(row)} title="Duplicate" className="rounded p-1 text-silver-400 hover:bg-steel-600 hover:text-white transition">
            <Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(row.id)} title="Delete" className="rounded p-1 text-silver-400 hover:bg-red-900/50 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" /></button>
          {expanded ? <ChevronUp className="h-4 w-4 text-silver-400" /> : <ChevronDown className="h-4 w-4 text-silver-400" />}
        </div>
      </div>

      {/* ââ Expanded Detail ââ */}
      {expanded && (
        <div className="px-4 py-4 bg-steel-900 border-t border-steel-700 space-y-4">
          {/* CHORD REINFORCEMENT */}
          <div className="rounded-lg border border-steel-700 bg-steel-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-fire-500" />
              <h4 className="text-sm font-bold text-silver-100">Chord Reinforcement</h4>
              <span className="ml-auto text-xs text-silver-400">Top & Bottom chord reinforcing</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              {/* Top Chord Section */}
              <div className="col-span-2 lg:col-span-4">
                <p className="text-[11px] font-bold text-fire-400 mb-1 uppercase tracking-wide">Top Chord</p>
              </div>
              <div>
                <label className={labelCls}>Bars / Chord</label>
                <input type="number" min="0" value={row.chord_barsPerChord || ''} onChange={e => setInt('chord_barsPerChord', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Bar Diameter</label>
                <select value={row.chord_topBarDia} onChange={e => setTopBarDia(e.target.value)} className={selCls}>
                  {BAR_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Weight (lbs/ft)</label>
                <input type="number" min="0" step="0.01" value={row.chord_topLbsPerFt || ''} onChange={e => setNum('chord_topLbsPerFt', e.target.value)} className={`${inCls} !text-blue-400`} />
              </div>
              <div>
                <label className={labelCls}>Reinf. Length (ft)</label>
                <input type="number" min="0" step="0.5" value={row.chord_topLength || ''} onChange={e => setNum('chord_topLength', e.target.value)} className={inCls} />
              </div>

              {/* Bottom Chord Section */}
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-[11px] font-bold text-fire-400 mb-1 uppercase tracking-wide">Bottom Chord</p>
              </div>
              <div>
                <label className={labelCls}>Material Type</label>
                <select value={row.chord_botType} onChange={e => set('chord_botType', e.target.value)} className={selCls}>
                  <option value="bar">Round Bar</option>
                  <option value="plate">Plate</option>
                </select>
              </div>
              {isBotBar ? (
                <>
                  <div>
                    <label className={labelCls}>Bars / Chord</label>
                    <input type="number" min="1" max="4" value={row.chord_botBarsPerChord || ''} onChange={e => setInt('chord_botBarsPerChord', e.target.value)} className={inCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Bar Diameter</label>
                    <select value={row.chord_botBarDia} onChange={e => setBotBarDia(e.target.value)} className={selCls}>
                      {BAR_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Weight (lbs/ft)</label>
                    <input type="number" min="0" step="0.01" value={row.chord_botLbsPerFt || ''} onChange={e => setNum('chord_botLbsPerFt', e.target.value)} className={`${inCls} !text-blue-400`} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Plate Size</label>
                    <select value={row.chord_botPlateSize} onChange={e => setBotPlate(e.target.value)} className={selCls}>
                      {PLATE_SIZES.map(p => <option key={p.label} value={p.label}>{p.label}{p.w > 0 ? ` (${plateLbsPerFt(p.w, p.t).toFixed(1)} lbs/ft)` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Weight (lbs/ft)</label>
                    <input type="number" min="0" step="0.01" value={row.chord_botLbsPerFt || ''} onChange={e => setNum('chord_botLbsPerFt', e.target.value)} className={`${inCls} !text-blue-400`} />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Reinf. Length (ft)</label>
                <input type="number" min="0" step="0.5" value={row.chord_botLength || ''} onChange={e => setNum('chord_botLength', e.target.value)} className={inCls} />
              </div>

              {/* Weld Parameters */}
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-[11px] font-bold text-silver-200 mb-1 uppercase tracking-wide">Weld Parameters</p>
              </div>
              <div>
                <label className={labelCls}>Weld Size (in)</label>
                <input type="number" min="0" step="0.5" value={row.chord_weldSize || ''} onChange={e => setNum('chord_weldSize', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Spacing O.C. (in)</label>
                <input type="number" min="1" value={row.chord_weldSpacing || ''} onChange={e => setInt('chord_weldSpacing', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Min / Weld</label>
                <input type="number" min="0" step="0.5" value={row.chord_minPerWeld || ''} onChange={e => setNum('chord_minPerWeld', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Crew Size</label>
                <input type="number" min="1" value={row.chord_crewSize || ''} onChange={e => setInt('chord_crewSize', e.target.value)} className={inCls} />
              </div>
            </div>

            {/* Chord Calculated Results */}
            <div className="mt-3 pt-3 border-t border-steel-700 grid grid-cols-3 lg:grid-cols-6 gap-3">
              <div><p className="text-[10px] text-silver-400">Top Welds</p><p className="text-sm font-bold text-silver-100">{fmtNum(calc.topWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Bot Welds</p><p className="text-sm font-bold text-silver-100">{fmtNum(calc.botWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Total Welds</p><p className="text-sm font-bold text-silver-100">{fmtNum(calc.chordTotalWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Weld Inches</p><p className="text-sm font-bold text-silver-100">{fmtNum(calc.chordWeldInches)}</p></div>
              <div><p className="text-[10px] text-silver-400">Hours</p><p className="text-sm font-bold text-fire-400">{fmtDec(calc.chordHrs, 1)}</p></div>
              <div><p className="text-[10px] text-silver-400">Total</p><p className="text-sm font-bold text-fire-400">{fmt(calc.chordInstall)}</p></div>
            </div>
          </div>

          {/* WEB REINFORCEMENT */}
          <div className="rounded-lg border border-steel-700 bg-steel-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-steel-400" />
              <h4 className="text-sm font-bold text-silver-100">Web Reinforcement</h4>
              <span className="ml-auto text-xs text-silver-400">Vertical & diagonal web members</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Web Qty / Joist</label>
                <input type="number" min="0" value={row.web_qtyPerJoist || ''} onChange={e => setInt('web_qtyPerJoist', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Angle Size</label>
                <select value={row.web_angleSize} onChange={e => setWebAngle(e.target.value)} className={selCls}>
                  {ANGLE_SIZES.map(a => <option key={a.label} value={a.label}>{a.label}{a.lbsPerFt > 0 ? ` (${a.lbsPerFt} lbs/ft)` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Angle Weight (lbs/ft)</label>
                <input type="number" min="0" step="0.01" value={row.web_angleLbsPerFt || ''} onChange={e => setNum('web_angleLbsPerFt', e.target.value)} className={`${inCls} !text-blue-400`} />
              </div>
              <div>
                <label className={labelCls}>Min / Weld</label>
                <input type="number" min="0" step="0.5" value={row.web_minPerWeld || ''} onChange={e => setNum('web_minPerWeld', e.target.value)} className={inCls} />
              </div>

              <div className="col-span-2 lg:col-span-4 mt-1">
                <p className="text-[11px] font-bold text-silver-200 mb-1 uppercase tracking-wide">Members</p>
              </div>
              <div>
                <label className={labelCls}>Vert. Angles Qty</label>
                <input type="number" min="0" value={row.web_vertQty || ''} onChange={e => setInt('web_vertQty', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Vert. Length (ft)</label>
                <div className="flex items-center gap-1">
                  {row.web_vertLengthAuto ? (
                    <span className="flex-1 px-1.5 py-1 text-xs font-mono text-right text-blue-400">{(parseInt(row.joistType) || 24) / 12} (auto)</span>
                  ) : (
                    <input type="number" min="0" step="0.5" value={row.web_vertLength || ''} onChange={e => setNum('web_vertLength', e.target.value)} className={`flex-1 ${inCls}`} />
                  )}
                  <button onClick={() => set('web_vertLengthAuto', !row.web_vertLengthAuto)} className={`text-[9px] px-1.5 py-0.5 rounded ${row.web_vertLengthAuto ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-steel-700 text-silver-400 border border-steel-600'}`} title="Toggle auto-calc from joist depth">
                    {row.web_vertLengthAuto ? 'AUTO' : 'MAN'}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Diag. Angles Qty</label>
                <input type="number" min="0" value={row.web_diagQty || ''} onChange={e => setInt('web_diagQty', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Diag. Length (ft)</label>
                <div className="flex items-center gap-1">
                  {row.web_diagLengthAuto ? (
                    <span className="flex-1 px-1.5 py-1 text-xs font-mono text-right text-blue-400">{(Math.sqrt(2) * (parseInt(row.joistType) || 24) / 12).toFixed(2)} (auto)</span>
                  ) : (
                    <input type="number" min="0" step="0.5" value={row.web_diagLength || ''} onChange={e => setNum('web_diagLength', e.target.value)} className={`flex-1 ${inCls}`} />
                  )}
                  <button onClick={() => set('web_diagLengthAuto', !row.web_diagLengthAuto)} className={`text-[9px] px-1.5 py-0.5 rounded ${row.web_diagLengthAuto ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-steel-700 text-silver-400 border border-steel-600'}`} title="Toggle auto-calc from joist depth">
                    {row.web_diagLengthAuto ? 'AUTO' : 'MAN'}
                  </button>
                </div>
              </div>
            </div>

            {/* Web Calculated Results */}
            <div className="mt-3 pt-3 border-t border-steel-700 grid grid-cols-3 lg:grid-cols-6 gap-3">
              <div><p className="text-[10px] text-silver-400">Web Welds</p><p className="text-sm font-bold text-silver-100">{fmtNum(calc.webWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Hours</p><p className="text-sm font-bold text-fire-400">{fmtDec(calc.webHrs, 1)}</p></div>
              <div><p className="text-[10px] text-silver-400">Material</p><p className="text-sm font-bold text-silver-100">{fmt(calc.webMaterial)}</p></div>
              <div><p className="text-[10px] text-silver-400">Total</p><p className="text-sm font-bold text-fire-400">{fmt(calc.webInstall)}</p></div>
              <div></div><div></div>
            </div>
          </div>

          {/* CROSS-SECTION DIAGRAM */}
          <JoistCrossSection row={row} />

          {/* JR TOTALS BAR */}
          <div className="rounded-lg bg-steel-800 p-3 grid grid-cols-3 lg:grid-cols-7 gap-3">
            <div><p className="text-[10px] text-silver-400">Total Weight</p><p className="text-sm font-bold text-white">{fmtDec(calc.totalWeight, 0)} lbs</p></div>
            <div><p className="text-[10px] text-silver-400">Total Hours</p><p className="text-sm font-bold text-white">{fmtDec(calc.totalHrs, 1)}</p></div>
            <div><p className="text-[10px] text-silver-400">Days</p><p className="text-sm font-bold text-white">{fmtDec(calc.totalDays, 2)}</p></div>
            <div><p className="text-[10px] text-silver-400">Weeks</p><p className="text-sm font-bold text-white">{fmtDec(calc.totalWeeks, 2)}</p></div>
            <div><p className="text-[10px] text-silver-400">Material</p><p className="text-sm font-bold text-white">{fmt(calc.totalMaterial)}</p></div>
            <div><p className="text-[10px] text-silver-400">Install</p><p className="text-sm font-bold text-white">{fmt(calc.totalLabor)}</p></div>
            <div><p className="text-[10px] text-fire-400 font-bold">$/Joist</p><p className="text-sm font-bold text-fire-400">{fmt(calc.perJoist)}</p></div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-silver-300">Notes</label>
            <input type="text" value={row.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..."
              className="w-full bg-steel-700 border border-steel-600 rounded px-2 py-1.5 text-xs font-mono text-white placeholder:text-silver-500 focus:outline-none focus:ring-1 focus:ring-fire-500" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ââ Main Page Component ââ */
export default function JoistReinf() {
  const { state, dispatch } = useProject();
  const rows = state.joistReinf || [];

  const addRow = () => dispatch({ type: 'ADD_JOIST_REINF_ROW', payload: defaultRow() });

  const duplicateRow = (row) =>
    dispatch({ type: 'ADD_JOIST_REINF_ROW', payload: { ...row, id: crypto.randomUUID(), mark: row.mark + ' (copy)' } });

  const updateRow = (id, field, value) =>
    dispatch({ type: 'UPDATE_JOIST_REINF_ROW', payload: { id, [field]: value } });

  const deleteRow = (id) => dispatch({ type: 'DELETE_JOIST_REINF_ROW', payload: id });

  // Global summary across all JR blocks
  const summary = useMemo(() => {
    let totalWeight = 0, totalHrs = 0, totalMaterial = 0, totalInstall = 0, totalLabor = 0, totalQty = 0;
    rows.forEach(r => {
      const c = calcRow(r, state.rates?.labourRates || {});
      const q = Number(r.qty) || 1;
      totalQty += q;
      totalWeight += c.totalWeight;
      totalHrs += c.totalHrs * q;
      totalMaterial += c.totalMaterial;
      totalInstall += c.totalInstall;
      totalLabor += c.totalLabor;
    });
    return { totalItems: rows.length, totalQty, totalWeight, totalTons: totalWeight / 2000, totalHrs, totalMaterial, totalInstall, totalLabor };
  }, [rows]);

  // Sync computed values (weight, hours, cost) back to context so StructuralTakeoff can read them
  useEffect(() => {
    rows.forEach(r => {
      const c = calcRow(r, state.rates?.labourRates || {});
      const q = Number(r.qty) || 1;
      const weightLbs = Math.round(c.totalWeight);
      // Multiply by crew so ST sees true man-hours (JR formula: hours × crew × rate)
      const chordCrew = Number(r.chord_crewSize) || 2;
      const webCrew = 2; // JR formula uses fixed crew=2 for web work
      const fabHrs = Math.round(c.chordHrs * q * chordCrew * 100) / 100;
      // webHrs only (c.totalHrs already includes c.chordHrs)
      const instHrs = Math.round((c.totalHrs - c.chordHrs) * q * webCrew * 100) / 100;
      const materialCost = Math.round(c.totalMaterial);
      const installCost = Math.round(c.totalInstall);
      // Only dispatch if values actually changed to prevent infinite loops
      if (r.weightLbs !== weightLbs || r.fabHrs !== fabHrs || r.instHrs !== instHrs
          || r.materialCost !== materialCost || r.installCost !== installCost) {
        dispatch({ type: 'UPDATE_JOIST_REINF_ROW', payload: {
          id: r.id, weightLbs, fabHrs, instHrs, materialCost, installCost
        }});
      }
    });
  }, [rows.map(r => [r.qty, r.chord_topLength, r.chord_botLength, r.chord_barsPerChord,
    r.chord_topLbsPerFt, r.chord_botLbsPerFt, r.chord_weldSpacing, r.chord_weldSize,
    r.chord_minPerWeld, r.chord_crewSize, r.chord_botType, r.chord_botBarsPerChord,
    r.chord_botPlateW, r.chord_botPlateT, r.web_qtyPerJoist, r.web_angleLbsPerFt,
    r.web_vertQty, r.web_vertLength, r.web_vertLengthAuto, r.web_diagQty, r.web_diagLength,
    r.web_diagLengthAuto, r.web_minPerWeld, r.joistType].join(',')).join('|')]);

  // Inject scrollbar CSS
  useEffect(() => {
    const id = 'jr-scrollbar-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = SCROLLBAR_CSS;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="min-h-screen bg-steel-900 jr-scroll">
      <div className="accent-stripe h-1.5 bg-gradient-to-r from-fire-500 via-fire-600 to-steel-800" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="page-title flex items-center gap-3 text-3xl font-bold text-white">
            <Grid3X3 className="h-8 w-8 text-fire-600" />
            Joist Reinforcement
          </div>
          <p className="page-subtitle mt-1 text-sm text-silver-400">
            Parametric calculator â bar, plate &amp; channel methods with automatic weld &amp; labor calculations
          </p>
        </div>

        {/* Info Legend */}
        <JoistInfoLegend />

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { label: 'JR Blocks', value: fmtNum(summary.totalItems) },
            { label: 'Total Joists', value: fmtNum(summary.totalQty) },
            { label: 'Weight (lbs)', value: fmtNum(summary.totalWeight) },
            { label: 'Weight (tons)', value: fmtDec(summary.totalTons, 2) },
            { label: 'Total Hours', value: fmtDec(summary.totalHrs, 1) },
            { label: 'Material', value: fmt(summary.totalMaterial) },
            { label: 'Install', value: fmt(summary.totalLabor) },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-steel-700 bg-steel-800 p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-silver-400">{c.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Header row labels */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-silver-200">Reinforcement Schedule</h2>
          <button onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600 focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2">
            <Plus className="h-4 w-4" />Add JR Block
          </button>
        </div>

        {/* Column labels bar */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-silver-400">
            <span className="w-8 text-center">#</span>
            <div className="flex-1 grid grid-cols-8 gap-2">
              <span>Mark</span><span>Location</span><span>Joist Type</span><span>Span (ft)</span>
              <span className="col-span-2">Reinf. Method</span><span>Qty</span>
            </div>
            <span className="w-32 text-right">Hours | $/Joist</span>
            <span className="w-16"></span>
          </div>
        )}

        {/* JR Blocks */}
        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <JRBlock key={row.id} row={row} index={idx}
              onUpdate={updateRow} onDelete={deleteRow} onDuplicate={duplicateRow} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-steel-600 bg-steel-800 p-12 text-center shadow-sm">
            <Grid3X3 className="mx-auto h-12 w-12 text-steel-600" />
            <h3 className="mt-4 text-lg font-semibold text-silver-200">No joist reinforcements yet</h3>
            <p className="mt-1 text-sm text-silver-400">
              Click <span className="font-semibold text-fire-600">"Add JR Block"</span> to begin your parametric reinforcement schedule.
            </p>
          </div>
        )}

        {/* Grand Total */}
        {rows.length > 0 && (
          <div className="mt-6 rounded-xl border border-steel-700 bg-steel-800 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-silver-200">Grand Total â All JR Blocks</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              <div>
                <p className="text-xs text-silver-400">Total Weight</p>
                <p className="mt-0.5 text-lg font-bold text-white">{fmtNum(summary.totalWeight)} lbs</p>
                <p className="text-[10px] text-silver-500">{fmtDec(summary.totalTons, 2)} tons</p>
              </div>
              <div>
                <p className="text-xs text-silver-400">Total Hours</p>
                <p className="mt-0.5 text-lg font-bold text-white">{fmtDec(summary.totalHrs, 1)}</p>
                <p className="text-[10px] text-silver-500">{fmtDec(summary.totalHrs / 8, 1)} days</p>
              </div>
              <div>
                <p className="text-xs text-silver-400">Material Cost</p>
                <p className="mt-0.5 text-lg font-bold text-white">{fmt(summary.totalMaterial)}</p>
                <p className="text-[10px] text-silver-500">incl. {MATERIAL_MARKUP}x markup</p>
              </div>
              <div>
                <p className="text-xs text-silver-400">Total</p>
                <p className="mt-0.5 text-lg font-bold text-white">{fmt(summary.totalInstall)}</p>
                <p className="text-[10px] text-silver-500">labor + material</p>
              </div>
              <div className="rounded-lg bg-steel-800 p-3">
                <p className="text-xs text-silver-300">Grand Total</p>
                <p className="mt-0.5 text-lg font-bold text-fire-400">{fmt(summary.totalInstall)}</p>
                <p className="text-[10px] text-silver-400">all JR blocks combined</p>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-steel-700 pt-6 text-center">
          <p className="text-xs text-silver-400">
            Triple Weld Inc. &mdash; Steel Estimating Suite &mdash; Joist Reinforcement Module v2.0
          </p>
        </footer>
      </div>
    </div>
  );
}
