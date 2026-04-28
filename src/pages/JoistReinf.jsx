import { useState, useMemo } from 'react';
import { Grid3X3, Plus, Trash2, Copy, ChevronDown, ChevronUp, Info, Wrench } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

/* ── Formatting helpers ── */
const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = (v, d = 2) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ── Bar weight lookup (lbs/ft) ── */
const BAR_WEIGHTS = {
  '1/2': 0.67, '5/8': 1.04, '3/4': 1.50, '7/8': 2.05,
  '1': 2.67, '1-1/8': 3.38, '1-1/4': 4.18,
};
const BAR_SIZES = Object.keys(BAR_WEIGHTS);

/* ── Common plate sizes (width×thickness → lbs/ft) ── */
const PLATE_SIZES = [
  { label: 'PL 3×1/4', w: 3, t: 0.25 },
  { label: 'PL 3×3/8', w: 3, t: 0.375 },
  { label: 'PL 4×1/4', w: 4, t: 0.25 },
  { label: 'PL 4×3/8', w: 4, t: 0.375 },
  { label: 'PL 4×1/2', w: 4, t: 0.5 },
  { label: 'PL 6×1/4', w: 6, t: 0.25 },
  { label: 'PL 6×3/8', w: 6, t: 0.375 },
  { label: 'PL 6×1/2', w: 6, t: 0.5 },
  { label: 'PL 8×3/8', w: 8, t: 0.375 },
  { label: 'PL 8×1/2', w: 8, t: 0.5 },
  { label: 'PL 10×3/8', w: 10, t: 0.375 },
  { label: 'PL 10×1/2', w: 10, t: 0.5 },
  { label: 'Custom', w: 0, t: 0 },
];
const plateLbsPerFt = (w, t) => w * t * 3.4032;

/* ── Angle sizes for web reinforcement (lbs/ft) ── */
const ANGLE_SIZES = [
  { label: 'L1×1×1/8', lbsPerFt: 0.80 },
  { label: 'L1×1×3/16', lbsPerFt: 1.16 },
  { label: 'L1-1/4×1-1/4×1/8', lbsPerFt: 1.01 },
  { label: 'L1-1/2×1-1/2×1/8', lbsPerFt: 1.23 },
  { label: 'L1-1/2×1-1/2×3/16', lbsPerFt: 1.80 },
  { label: 'L2×2×1/8', lbsPerFt: 1.65 },
  { label: 'L2×2×3/16', lbsPerFt: 2.44 },
  { label: 'L2×2×1/4', lbsPerFt: 3.19 },
  { label: 'L2-1/2×2-1/2×1/8', lbsPerFt: 2.08 },
  { label: 'L2-1/2×2-1/2×3/16', lbsPerFt: 3.07 },
  { label: 'L2-1/2×2-1/2×1/4', lbsPerFt: 4.10 },
  { label: 'L3×3×3/16', lbsPerFt: 3.71 },
  { label: 'L3×3×1/4', lbsPerFt: 4.90 },
  { label: 'Custom', lbsPerFt: 0 },
];

/* ── SJI Joist Types ── */
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

/* ── Reinforcement Methods ── */
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

/* ── Install/Fab rates from Rates & Config ── */
const MATERIAL_MARKUP = 1.5;
const INSTALL_RATE = 110;
const FAB_RATE = 95;

/* ── Default row factory ── */
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
  chord_botPlateSize: 'PL 4×3/8',
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
  web_angleSize: 'L1-1/2×1-1/2×1/8',
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

/* ── Calculations for a single JR row ── */
function calcRow(r) {
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

  // Top welds: ((topLen_ft × 12 / spacing) + 4 extra) × 2 sides × bars
  const topWelds = topLen > 0 ? Math.ceil(((topLen * 12) / spacing + 4) * 2 * bars) : 0;
  // Bottom welds: if bars → same formula as top (per bar, 2 sides); if plate → 2 continuous sides
  const botWelds = botLen > 0
    ? (isBotBar
        ? Math.ceil(((botLen * 12) / spacing + 4) * 2 * botBars)
        : Math.ceil(((botLen * 12) / spacing + 4) * 2))
    : 0;
  const chordTotalWelds = topWelds + botWelds;
  const chordWeldInches = chordTotalWelds * weldSize;
  const chordHrs = (chordTotalWelds * chordMinPerWeld) / 60;
  // Material: (topLbs × topLen × topBars + botLbs × botLen �� botBars) × qty × markup
  const chordMaterial = (topLbs * topLen * bars + botLbs * botLen * botBars) * qty * MATERIAL_MARKUP;
  // Install: qty × hours × crewSize × rate + material
  const chordInstall = qty * chordHrs * crewSize * INSTALL_RATE + chordMaterial;

  // WEB calculations
  const webQty = Number(r.web_qtyPerJoist) || 0;
  const webLbs = Number(r.web_angleLbsPerFt) || 0;
  const joistDepthIn = parseInt(r.joistType) || 24;
  const vertQ = Number(r.web_vertQty) || 0;
  // Auto-calc vertical length from joist depth (in → ft) if auto mode, else manual
  const vertL = r.web_vertLengthAuto ? (joistDepthIn / 12) : (Number(r.web_vertLength) || 0);
  const diagQ = Number(r.web_diagQty) || 0;
  // Auto-calc diagonal length: hypotenuse based on depth and typical panel width (~depth)
  const diagL = r.web_diagLengthAuto ? (Math.sqrt(2) * joistDepthIn / 12) : (Number(r.web_diagLength) || 0);
  const webMinPerWeld = Number(r.web_minPerWeld) || 5;

  // Web welds: each member has 2 ends × 2 sides = 4 welds
  const webWelds = (vertQ * 4 + diagQ * 4);
  const webHrs = webQty > 0 ? (webQty * 0.5 + webQty * 4 * (webMinPerWeld / 60)) : 0;
  // Web material: (vertQ×vertL + diagQ×diagL) × webLbs × 2sides × markup + clip angles
  const webMaterial = (qty * webLbs * vertQ * vertL + qty * webLbs * diagQ * diagL) * 2 * MATERIAL_MARKUP
    + qty * webQty * 1.7 * 4; // clip angle allowance
  const webInstall = qty * webHrs * 2 * INSTALL_RATE + webMaterial;

  // Totals
  const totalHrs = chordHrs + webHrs;
  const totalDays = totalHrs / 8;
  const totalWeeks = totalDays / 5;
  const totalMaterial = chordMaterial + webMaterial;
  const totalInstall = chordInstall + webInstall;
  const totalWeight = (topLbs * topLen * bars + botLbs * botLen * botBars
    + webLbs * (vertQ * vertL + diagQ * diagL) * 2) * qty;
  const perJoist = qty > 0 ? totalInstall / qty : 0;

  return {
    topWelds, botWelds, chordTotalWelds, chordWeldInches, chordHrs, chordMaterial, chordInstall,
    webWelds, webHrs, webMaterial, webInstall,
    totalHrs, totalDays, totalWeeks, totalMaterial, totalInstall, totalWeight, perJoist,
  };
}

/* ── Reactive Cross-Section Diagram ── */
function JoistCrossSection({ row }) {
  const isBotBar = row.chord_botType === 'bar';
  const topBarCount = Math.min(Number(row.chord_barsPerChord) || 2, 4);
  const botBarCount = isBotBar ? Math.min(Number(row.chord_botBarsPerChord) || 2, 4) : 0;
  const method = row.reinfMethod || '';
  const hasWeb = (Number(row.web_vertQty) || 0) + (Number(row.web_diagQty) || 0) > 0;
  const depth = parseInt(row.joistType) || 24;
  const series = row.joistType?.match(/[A-Z]+/)?.[0] || 'K';

  // === TRUE CROSS-SECTION (perpendicular cut through joist) ===
  const W = 360, H = 320, cX = W / 2;
  // Scale: map joist depth (inches) to SVG pixels — use proportional scaling
  const scale = Math.min(200 / depth, 8); // pixels per inch, capped
  const jDepth = depth * scale; // total depth in px
  const topCY = (H - jDepth) / 2 + 20; // top chord center Y
  const botCY = topCY + jDepth; // bottom chord center Y

  // Colors
  const steel = '#334155';
  const fire = '#dc2626';
  const blue = '#2563eb';
  const silver = '#94a3b8';
  const orange = '#ea580c';
  const green = '#16a34a';

  // === TOP CHORD: double angle back-to-back (L-shapes mirrored) ===
  // Angle leg sizes (visual, not to real scale — just representative)
  const aLeg = Math.max(12, Math.min(20, depth * 0.5)); // angle leg length
  const aT = Math.max(3, aLeg * 0.2); // angle thickness
  const gap = 3; // gap between back-to-back angles

  // Left angle of top chord (L rotated: vertical leg up, horizontal leg to left)
  const tcLx = cX - gap / 2; // right edge of left angle
  const tcRx = cX + gap / 2; // left edge of right angle

  // === BOTTOM CHORD: same double angle ===
  // === WEB MEMBER: single angle shown as cross-section (small L) ===
  const webLeg = Math.max(8, aLeg * 0.6);
  const webT = Math.max(2, webLeg * 0.18);

  // === DETERMINE REINF TYPE per method ===
  const topType = method.includes('Bars Top') ? 'bar'
    : method.includes('Angle') ? 'angle'
    : method.includes('Channel') ? 'channel'
    : method.includes('HSS') ? 'hss'
    : method.includes('Splice') || method === 'Full Replacement' ? 'splice'
    : 'bar'; // Custom defaults to bar

  const botType = method.includes('Plate') ? 'plate'
    : method.includes('2 Bars Bot') || method.includes('Bars Bottom') ? 'bar'
    : method.includes('Channel') ? 'channel'
    : method.includes('HSS') ? 'hss'
    : method.includes('Splice') || method === 'Full Replacement' ? 'splice'
    : isBotBar ? 'bar' : 'plate';

  // === REINFORCEMENT BAR positions ===
  const barR = Math.max(4, Math.min(7, depth * 0.2));
  const barSpacing = barR * 3;

  // Top reinf bars — only when topType === 'bar'
  const topBars = [];
  if (topType === 'bar') {
    for (let i = 0; i < topBarCount; i++) {
      const startX = cX - ((topBarCount - 1) * barSpacing) / 2;
      topBars.push({ cx: startX + i * barSpacing, cy: topCY - aLeg - barR - 3 });
    }
  }

  // Bottom reinf bars — only when botType === 'bar'
  const botBars = [];
  if (botType === 'bar') {
    for (let i = 0; i < botBarCount; i++) {
      const startX = cX - ((botBarCount - 1) * barSpacing) / 2;
      botBars.push({ cx: startX + i * barSpacing, cy: botCY + aLeg + barR + 3 });
    }
  }

  // Bottom plate dims — only when botType === 'plate'
  const botPlateW = botType === 'plate' ? Math.max(20, (Number(row.chord_botPlateW) || 4) * 4) : 0;
  const botPlateT = botType === 'plate' ? Math.max(3, (Number(row.chord_botPlateT) || 0.25) * 10) : 0;

  // Reinforcement angle (for "Angle + Plate" top)
  const reinfALeg = Math.max(10, aLeg * 0.75);
  const reinfAT = Math.max(2.5, reinfALeg * 0.18);

  // Channel dims (C-shape) for Channel Reinforcement
  const chW = Math.max(10, aLeg * 0.6);
  const chH = Math.max(18, aLeg * 1.2);
  const chT = Math.max(2, chW * 0.2);
  const chFl = Math.max(4, chW * 0.45); // flange depth

  // HSS dims (rectangular tube) for HSS Strongback
  const hssW = Math.max(12, aLeg * 0.7);
  const hssH = Math.max(16, aLeg * 1.0);
  const hssT = Math.max(2, hssW * 0.15);

  // Helper: draw one L-angle cross-section (origin at corner, facing direction)
  const AngleL = ({ x, y, leg, t, flipH, flipV, color, opacity }) => {
    const sX = flipH ? -1 : 1;
    const sY = flipV ? -1 : 1;
    // L-shape: vertical leg + horizontal leg
    return (
      <path
        d={`M ${x},${y}
            l ${sX * t},0
            l 0,${sY * (leg - t)}
            l ${sX * (leg - t)},0
            l 0,${sY * t}
            l ${sX * -(leg)},0
            Z`}
        fill={color} opacity={opacity || 0.85} stroke={color} strokeWidth="0.5"
      />
    );
  };

  return (
    <div className="rounded-lg border border-silver-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4 w-4 text-fire-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
        <h4 className="text-sm font-bold text-steel-700">Cross Section (perpendicular cut)</h4>
        <span className="ml-auto text-xs text-silver-400">{row.joistType} — {method}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[360px] mx-auto" style={{ height: 'auto' }}>

        {/* CENTER LINE (dashed) Leg + 12} y={topCY - aLeg / 2 + 13} fill={silver} fontSize="7" fontFamily="monospace">2L back-to-back</text>

        {/* === BOTTOM CHORD — double angle back-to-back === */}
        {/* Left angle: vertical leg goes DOWN, horizontal leg goes LEFT */}
        <AngleL x={tcLx} y={botCY} leg={aLeg} t={aT} flipH={true} flipV={false} color={steel} />
        {/* Right angle: vertical leg goes DOWN, horizontal leg goes RIGHT */}
        <AngleL x={tcRx} y={botCY} leg={aLeg} t={aT} flipH={false} flipV={false} color={steel} />
        <text x={cX + aLeg + 12} y={botCY + aLeg / 2 + 3} fill={steel} fontSize="8" fontFamily="monospace" fontWeight="bold">BOT CHORD</text>
        <text x={cX + aLeg + 12} y={botCY + aLeg / 2 + 13} fill={silver} fontSize="7" fontFamily="monospace">2L back-to-back</text>

        {/* === WEB MEMBER — single angle (between chords) === */}
        {hasWeb && (
          <g>
            <AngleL x={cX - webT / 2} y={(topCY + botCY) / 2 - webLeg / 2} leg={webLeg} t={webT} flipH={false} flipV={false} color={green} opacity={0.7} />
            <text x={cX + webLeg + 8} y={(topCY + botCY) / 2 + 3} fill={green} fontSize="7" fontFamily="monospace" fontWeight="bold">WEB: {row.web_angleSize}</text>
          </g>
        )}

        {/* === DEPTH DIMENSION LINE (left side) === */}
        <line x1={cX - aLeg - 30} y1={topCY} x2={cX - aLeg - 30} y2={botCY} stroke={silver} strokeWidth="0.8" />
        <line x1={cX - aLeg - 35} y1={topCY} x2={cX - aLeg - 25} y2={topCY} stroke={silver} strokeWidth="0.8" />
        <line x1={cX - aLeg - 35} y1={botCY} x2={cX - aLeg - 25} y2={botCY} stroke={silver} strokeWidth="0.8" />
        <text x={cX - aLeg - 32} y={(topCY + botCY) / 2 + 4} textAnchor="middle" fill={silver} fontSize="9" fontFamily="monospace" transform={`rotate(-90, ${cX - aLeg - 32}, ${(topCY + botCY) / 2})`}>{depth}"</text>

        {/* === TOP REINFORCEMENT — method-reactive === */}
        {topType === 'bar' && (
          <g>
            {topBars.map((b, i) => (
              <g key={`tb${i}`}>
                <circle cx={b.cx} cy={b.cy} r={barR} fill="none" stroke={fire} strokeWidth="2" />
                <line x1={b.cx - barR * 0.5} y1={b.cy - barR * 0.5} x2={b.cx + barR * 0.5} y2={b.cy + barR * 0.5} stroke={fire} strokeWidth="1" />
                <line x1={b.cx + barR * 0.5} y1={b.cy - barR * 0.5} x2={b.cx - barR * 0.5} y2={b.cy + barR * 0.5} stroke={fire} strokeWidth="1" />
              </g>
            ))}
            {topBars.length > 0 && (
              <text x={topBars[topBars.length - 1].cx + barR + 6} y={topBars[0].cy + 3} fill={fire} fontSize="8" fontFamily="monospace" fontWeight="bold">
                {topBarCount}x {row.chord_topBarDia}" bar
              </text>
            )}
            {/* Weld symbols: top bars to top chord */}
            {topBars.map((b, i) => (
              <g key={`tw${i}`}>
                <line x1={b.cx - 4} y1={b.cy + barR + 2} x2={b.cx + 4} y2={b.cy + barR + 2} stroke={orange} strokeWidth="1.5" />
                <polygon points={`${b.cx - 3},${b.cy + barR + 2} ${b.cx},${b.cy + barR + 5} ${b.cx + 3},${b.cy + barR + 2}`} fill={orange} />
              </g>
            ))}
          </g>
        )}
        {topType === 'angle' && (
          <g>
            {/* Reinforcement angles welded to top of top chord — L shapes flanking */}
            <AngleL x={cX - gap / 2 - reinfALeg - 2} y={topCY - aLeg} leg={reinfALeg} t={reinfAT} flipH={false} flipV={true} color={fire} opacity={0.75} />
            <AngleL x={cX + gap / 2 + reinfALeg + 2} y={topCY - aLeg} leg={reinfALeg} t={reinfAT} flipH={true} flipV={true} color={fire} opacity={0.75} />
            <text x={cX + gap / 2 + reinfALeg + reinfALeg + 8} y={topCY - aLeg + reinfALeg / 2} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold">
              Reinf. angles
            </text>
            {/* Weld symbols */}
            <polygon points={`${cX - gap / 2 - 2},${topCY - aLeg} ${cX - gap / 2 - 5},${topCY - aLeg + 4} ${cX - gap / 2 + 1},${topCY - aLeg + 4}`} fill={orange} />
            <polygon points={`${cX + gap / 2 + 2},${topCY - aLeg} ${cX + gap / 2 + 5},${topCY - aLeg + 4} ${cX + gap / 2 - 1},${topCY - aLeg + 4}`} fill={orange} />
          </g>
        )}
        {topType === 'channel' && (
          <g>
            {/* C-channel sistered alongside top chord — left side */}
            <path d={`M ${cX - aLeg - 6},${topCY - chH / 2} l ${chFl},0 l 0,${chT} l ${-(chFl - chT)},0 l 0,${chH - 2 * chT} l ${chFl - chT},0 l 0,${chT} l ${-chFl},0 Z`}
              fill={fire} opacity={0.7} stroke={fire} strokeWidth="0.5" />
            <text x={cX - aLeg - chFl - 14} y={topCY + 3} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="end">C-Channel</text>
            {/* Weld symbols */}
            <polygon points={`${cX - aLeg - 6 + chFl},${topCY - 3} ${cX - aLeg - 6 + chFl + 4},${topCY} ${cX - aLeg - 6 + chFl},${topCY + 3}`} fill={orange} />
          </g>
        )}
        {topType === 'hss' && (
          <g>
            {/* HSS tube alongside top chord — left side */}
            <rect x={cX - aLeg - hssW - 6} y={topCY - hssH / 2} width={hssW} height={hssH} rx="2" fill="none" stroke={fire} strokeWidth="2.5" />
            <rect x={cX - aLeg - hssW - 6 + hssT} y={topCY - hssH / 2 + hssT} width={hssW - 2 * hssT} height={hssH - 2 * hssT} rx="1" fill={fire} opacity="0.15" />
            <text x={cX - aLeg - hssW - 12} y={topCY + 3} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="end">HSS Tube</text>
            {/* Weld/bolt symbol */}
            <polygon points={`${cX - aLeg - 6},${topCY - 3} ${cX - aLeg - 2},${topCY} ${cX - aLeg - 6},${topCY + 3}`} fill={orange} />
          </g>
        )}
        {topType === 'splice' && (
          <g>
            {/* Splice plates on both sides of top chord */}
            <rect x={cX - aLeg - 8} y={topCY - aLeg + 2} width={4} height={aLeg * 1.5} rx="0.5" fill={fire} opacity="0.8" />
            <rect x={cX + aLeg + 4} y={topCY - aLeg + 2} width={4} height={aLeg * 1.5} rx="0.5" fill={fire} opacity="0.8" />
            <text x={cX + aLeg + 14} y={topCY - aLeg / 2 + 3} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold">
              {method.includes('Bolted') ? 'Bolted' : method.includes('Welded') ? 'Welded' : 'Full'} Splice
            </text>
            {/* Bolt dots or weld marks */}
            {method.includes('Bolted') ? (
              <>
                <circle cx={cX - aLeg - 6} cy={topCY - aLeg / 2} r="2" fill={orange} />
                <circle cx={cX - aLeg - 6} cy={topCY} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={topCY - aLeg / 2} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={topCY} r="2" fill={orange} />
              </>
            ) : (
              <>
                <polygon points={`${cX - aLeg - 4},${topCY - 4} ${cX - aLeg - 7},${topCY} ${cX - aLeg - 1},${topCY}`} fill={orange} />
                <polygon points={`${cX + aLeg + 8},${topCY - 4} ${cX + aLeg + 5},${topCY} ${cX + aLeg + 11},${topCY}`} fill={orange} />
              </>
            )}
          </g>
        )}

        {/* === BOTTOM Rre} opacity="0.8" />
            <rect x={cX + aLeg + 4} y={topCY - aLeg + 2} width={4} height={aLeg * 1.5} rx="0.5" fill={fire} opacity="0.8" />
            <text x={cX + aLeg + 14} y={topCY - aLeg / 2 + 3} fill={fire} fontSize="7" fontFamily="monospace" fontWeight="bold">
              {method.includes('Bolted') ? 'Bolted' : method.includes('Welded') ? 'Welded' : 'Full'} Splice
            </text>
            {/* Bolt dots or weld marks */}
            {method.includes('Bolted') ? (
              <>
                <circle cx={cX - aLeg - 6} cy={topCY - aLeg / 2} r="2" fill={orange} />
                <circle cx={cX - aLeg - 6} cy={topCY} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={topCY - aLeg / 2} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={topCY} r="2" fill={orange} />
              </>
            ) : (
              <>
                <polygon points={`${cX - aLeg - 4},${topCY - 4} ${cX - aLeg - 7},${topCY} ${cX - aLeg - 1},${topCY}`} fill={orange} />
                <polygon points={`${cX + aLeg + 8},${topCY - 4} ${cX + aLeg + 5},${topCY} ${cX + aLeg + 11},${topCY}`} fill={orange} />
              </>
            )}
          </g>
        )}

        {/* === BOTTOM REINFORCEMENT — method-reactive === */}
        {botType === 'bar' && (
          <g>
            {botBars.map((b, i) => (
              <g key={`bb${i}`}>
                <circle cx={b.cx} cy={b.cy} r={barR} fill="none" stroke={blue} strokeWidth="2" />
                <line x1={b.cx - barR * 0.5} y1={b.cy - barR * 0.5} x2={b.cx + barR * 0.5} y2={b.cy + barR * 0.5} stroke={blue} strokeWidth="1" />
                <line x1={b.cx + barR * 0.5} y1={b.cy - barR * 0.5} x2={b.cx - barR * 0.5} y2={b.cy + barR * 0.5} stroke={blue} strokeWidth="1" />
              </g>
            ))}
            {botBars.length > 0 && (
              <text x={botBars[botBars.length - 1].cx + barR + 6} y={botBars[0].cy + 3} fill={blue} fontSize="8" fontFamily="monospace" fontWeight="bold">
                {botBarCount}x {row.chord_botBarDia}" bar
              </text>
            )}
            {botBars.map((b, i) => (
              <g key={`bw${i}`}>
                <line x1={b.cx - 4} y1={b.cy - barR - 2} x2={b.cx + 4} y2={b.cy - barR - 2} stroke={orange} strokeWidth="1.5" />
                <polygon points={`${b.cx - 3},${b.cy - barR - 2} ${b.cx},${b.cy - barR - 5} ${b.cx + 3},${b.cy - barR - 2}`} fill={orange} />
              </g>
            ))}
          </g>
        )}
        {botType === 'plate' && (
          <g>
            <rect x={cX - botPlateW / 2} y={botCY + aT + 2} width={botPlateW} height={botPlateT} rx="1" fill={blue} opacity="0.8" />
            <text x={cX + botPlateW / 2 + 6} y={botCY + aT + botPlateT / 2 + 4} fill={blue} fontSize="7" fontFamily="monospace" fontWeight="bold">
              {row.chord_botPlateSize}
            </text>
            <line x1={cX - botPlateW / 2 + 1} y1={botCY + aT + 1} x2={cX - botPlateW / 2 + 7} y2={botCY + aT + 1} stroke={orange} strokeWidth="1.5" />
            <line x1={cX + botPlateW / 2 - 7} y1={botCY + aT + 1} x2={cX + botPlateW / 2 - 1} y2={botCY + aT + 1} stroke={orange} strokeWidth="1.5" />
          </g>
        )}
        {botType === 'channel' && (
          <g>
            {/* C-channel sistered alongside bottom chord — right side */}
            <path d={`M ${cX + aLeg + 6 + chFl},${botCY - chH / 2} l ${-chFl},0 l 0,${chT} l ${chFl - chT},0 l 0,${chH - 2 * chT} l ${-(chFl - chT)},0 l 0,${chT} l ${chFl},0 Z`}
              fill={blue} opacity={0.7} stroke={blue} strokeWidth="0.5" />
            <text x={cX + aLeg + chFl + 12} y={botCY + 3} fill={blue} fontSize="7" fontFamily="monospace" fontWeight="bold">C-Channel</text>
            <polygon points={`${cX + aLeg + 6},${botCY - 3} ${cX + aLeg + 2},${botCY} ${cX + aLeg + 6},${botCY + 3}`} fill={orange} />
          </g>
        )}
        {botType === 'hss' && (
          <g>
            {/* HSS tube alongside bottom chord — right side */}
            <rect x={cX + aLeg + 6} y={botCY - hssH / 2} width={hssW} height={hssH} rx="2" fill="none" stroke={blue} strokeWidth="2.5" />
            <rect x={cX + aLeg + 6 + hssT} y={botCY - hssH / 2 + hssT} width={hssW - 2 * hssT} height={hssH - 2 * hssT} rx="1" fill={blue} opacity="0.15" />
            <text x={cX + aLeg + hssW + 12} y={botCY + 3} fill={blue} fontSize="7" fontFamily="monospace" fontWeight="bold">HSS Tube</text>
            <polygon points={`${cX + aLeg + 6},${botCY - 3} ${cX + aLeg + 2},${botCY} ${cX + aLeg + 6},${botCY + 3}`} fill={orange} />
          </g>
        )}
        {botType === 'splice' && (
          <g>
            {/* Splice plates on both sides of bottom chord */}
            <rect x={cX - aLeg - 8} y={botCY - aLeg * 0.25} width={4} height={aLeg * 1.5} rx="0.5" fill={blue} opacity="0.8" />
            <rect x={cX + aLeg + 4} y={botCY - aLeg * 0.25} width={4} height={aLeg * 1.5} rx="0.5" fill={blue} opacity="0.8" />
            {method.includes('Bolted') ? (
              <>
                <circle cx={cX - aLeg - 6} cy={botCY} r="2" fill={orange} />
                <circle cx={cX - aLeg - 6} cy={botCY + aLeg / 2} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={botCY} r="2" fill={orange} />
                <circle cx={cX + aLeg + 6} cy={botCY + aLeg / 2} r="2" fill={orange} />
              </>
            ) : (
              <>
                <polygon points={`${cX - aLeg - 4},${botCY - 2} ${cX - aLeg - 7},${botCY + 2} ${cX - aLeg - 1},${botCY + 2}`} fill={orange} />
                <polygon points={`${cX + aLeg + 8},${botCY - 2} ${cX + aLeg + 5},${botCY + 2} ${cX + aLeg + 11},${botCY + 2}`} fill={orange} />
              </>
            )}
          </g>
        )}

        {/* === LEGEND — adapts to method === */}
        <rect x="10" y={H - 22} width={W - 20} height="18" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
        {topType === 'bar' ? (
          <><circle cx="24" cy={H - 13} r="3.5" fill="none" stroke={fire} strokeWidth="1.5" /><text x="32" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Top Bars</text></>
        ) : (
          <><rect x="20" y={H - 17} width="8" height="8" fill={fire} opacity="0.75" rx="1" /><text x="32" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">{topType === 'angle' ? 'Top Angles' : topType === 'channel' ? 'Top Ch.' : topType === 'hss' ? 'Top HSS' : 'Splice'}</text></>
        )}
        {botType === 'bar' ? (
          <><circle cx="90" cy={H - 13} r="3.5" fill="none" stroke={blue} strokeWidth="1.5" /><text x="98" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Bot Bars</text></>
        ) : botType === 'plate' ? (
          <><rect x="86" y={H - 15} width="10" height="4" fill={blue} opacity="0.8" rx="0.5" /><text x="100" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Bot Plate</text></>
        ) : (
          <><rect x="86" y={H - 17} width="8" height="8" fill={blue} opacity="0.7" rx="1" /><text x="98" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">{botType === 'channel' ? 'Bot Ch.' : botType === 'hss' ? 'Bot HSS' : 'Splice'}</text></>
        )}
        <rect x="155" y={H - 17} width="8" height="8" fill={steel} opacity="0.85" rx="1" />
        <text x="167" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Chord 2L</text>
        {hasWeb && (<><rect x="215" y={H - 17} width="8" height="8" fill={green} opacity="0.7" rx="1" /><text x="227" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Web</text></>)}
        <line x1="260" y1={H - 15} x2="268" y2={H - 10} stroke={orange} strokeWidth="1.5" />
        <text x="273" y={H - 10} fill={silver} fontSize="6.5" fontFamily="monospace">Welds</text>

        {/* Title */}
        <text x={cX} y={14} textAnchor="middle" fill={steel} fontSize="10" fontFamily="monospace" fontWeight="bold">
          {row.joistType} — {series === 'K' ? 'Standard' : series === 'LH' ? 'Long Span' : 'Deep Long Span'} — Section Cut
        </text>
      </svg>
    </div>
  );
}

/* ─┈ Info Legend (collapsible) ─┈ */
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

/* ─┈ Expandable JR Block Row ─┈ */
function JRBlock({ row, index, onUpdate, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(false);
  const calc = useMemo(() => calcRow(row), [row]);

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
  const inCls = 'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-fire-500 rounded';
  const inTxtCls = 'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-fire-500 rounded';
  const selCls = 'w-full bg-transparent px-1.5 py-1 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-fire-500 rounded cursor-pointer';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-wide text-silver-500';

  return (
    <div className="border border-silver-200 rounded-lg mb-3 bg-white shadow-sm overflow-hidden">
      {/* ── Main Row (always visible) ── */}
      <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${expanded ? 'bg-steel-800 text-white' : 'hover:bg-steel-50'}`}
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
          <button onClick={() => onDuplicate(row)} title="Duplicate" className="rounded p-1 text-silver-400 hover:bg-steel-100 hover:text-steel-600 transition">
            <Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(row.id)} title="Delete" className="rounded p-1 text-silver-400 hover:bg-red-50 hover:text-red-500 transition">
            <Trash2 className="h-3.5 w-3.5" /></button>
          {expanded ? <ChevronUp className="h-4 w-4 text-silver-400" /> : <ChevronDown className="h-4 w-4 text-silver-400" />}
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="px-4 py-4 bg-steel-50 border-t border-silver-200 space-y-4">
          {/* CHORD REINFORCEMENT */}
          <div className="rounded-lg border border-silver-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-fire-500" />
              <h4 className="text-sm font-bold text-steel-700">Chord Reinforcement</h4>
              <span className="ml-auto text-xs text-silver-400">Top & Bottom chord reinforcing</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              {/* Top Chord Section */}
              <div className="col-span-2 lg:col-span-4">
                <p className="text-[11px] font-bold text-fire-600 mb-1 uppercase tracking-wide">Top Chord</p>
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
                <input type="number" min="0" step="0.01" value={row.chord_topLbsPerFt || ''} onChange={e => setNum('chord_topLbsPerFt', e.target.value)} className={`${inCls} text-blue-600`} />
              </div>
              <div>
                <label className={labelCls}>Reinf. Length (ft)</label>
                <input type="number" min="0" step="0.5" value={row.chord_topLength || ''} onChange={e => setNum('chord_topLength', e.target.value)} className={inCls} />
              </div>

              {/* Bottom Chord Section */}
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-[11px] font-bold text-fire-600 mb-1 uppercase tracking-wide">Bottom Chord</p>
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
                    <input type="number" min="0" step="0.01" value={row.chord_botLbsPerFt || ''} onChange={e => setNum('chord_botLbsPerFt', e.target.value)} className={`${inCls} text-blue-600`} />
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
                    <input type="number" min="0" step="0.01" value={row.chord_botLbsPerFt || ''} onChange={e => setNum('chord_botLbsPerFt', e.target.value)} className={`${inCls} text-blue-600`} />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Reinf. Length (ft)</label>
                <input type="number" min="0" step="0.5" value={row.chord_botLength || ''} onChange={e => setNum('chord_botLength', e.target.value)} className={inCls} />
              </div>

              {/* Weld Parameters */}
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-[11px] font-bold text-steel-600 mb-1 uppercase tracking-wide">Weld Parameters</p>
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
            <div className="mt-3 pt-3 border-t border-silver-100 grid grid-cols-3 lg:grid-cols-6 gap-3">
              <div><p className="text-[10px] text-silver-400">Top Welds</p><p className="text-sm font-bold text-steel-700">{fmtNum(calc.topWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Bot Welds</p><p className="text-sm font-bold text-steel-700">{fmtNum(calc.botWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Total Welds</p><p className="text-sm font-bold text-steel-700">{fmtNum(calc.chordTotalWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Weld Inches</p><p className="text-sm font-bold text-steel-700">{fmtNum(calc.chordWeldInches)}</p></div>
              <div><p className="text-[10px] text-silver-400">Hours</p><p className="text-sm font-bold text-fire-600">{fmtDec(calc.chordHrs, 1)}</p></div>
              <div><p className="text-[10px] text-silver-400">Install Cost</p><p className="text-sm font-bold text-fire-600">{fmt(calc.chordInstall)}</p></div>
            </div>
          </div>

          {/* WEB REINFORCEMENT */}
          <div className="rounded-lg border border-silver-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-steel-500" />
              <h4 className="text-sm font-bold text-steel-700">Web Reinforcement</h4>
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
                <input type="number" min="0" step="0.01" value={row.web_angleLbsPerFt || ''} onChange={e => setNum('web_angleLbsPerFt', e.target.value)} className={`${inCls} text-blue-600`} />
              </div>
              <div>
                <label className={labelCls}>Min / Weld</label>
                <input type="number" min="0" step="0.5" value={row.web_minPerWeld || ''} onChange={e => setNum('web_minPerWeld', e.target.value)} className={inCls} />
              </div>

              <div className="col-span-2 lg:col-span-4 mt-1">
                <p className="text-[11px] font-bold text-steel-600 mb-1 uppercase tracking-wide">Members</p>
              </div>
              <div>
                <label className={labelCls}>Vert. Angles Qty</label>
                <input type="number" min="0" value={row.web_vertQty || ''} onChange={e => setInt('web_vertQty', e.target.value)} className={inCls} />
              </div>
              <div>
                <label className={labelCls}>Vert. Length (ft)</label>
                <div className="flex items-center gap-1">
                  {row.web_vertLengthAuto ? (
                    <span className="flex-1 px-1.5 py-1 text-xs font-mono text-right text-blue-600">{(parseInt(row.joistType) || 24) / 12} (auto)</span>
                  ) : (
                    <input type="number" min="0" step="0.5" value={row.web_vertLength || ''} onChange={e => setNum('web_vertLength', e.target.value)} className={`flex-1 ${inCls}`} />
                  )}
                  <button onClick={() => set('web_vertLengthAuto', !row.web_vertLengthAuto)} className={`text-[9px] px-1.5 py-0.5 rounded ${row.web_vertLengthAuto ? 'bg-blue-100 text-blue-600' : 'bg-silver-100 text-silver-500'}`} title="Toggle auto-calc from joist depth">
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
                    <span className="flex-1 px-1.5 py-1 text-xs font-mono text-right text-blue-600">{(Math.sqrt(2) * (parseInt(row.joistType) || 24) / 12).toFixed(2)} (auto)</span>
                  ) : (
                    <input type="number" min="0" step="0.5" value={row.web_diagLength || ''} onChange={e => setNum('web_diagLength', e.target.value)} className={`flex-1 ${inCls}`} />
                  )}
                  <button onClick={() => set('web_diagLengthAuto', !row.web_diagLengthAuto)} className={`text-[9px] px-1.5 py-0.5 rounded ${row.web_diagLengthAuto ? 'bg-blue-100 text-blue-600' : 'bg-silver-100 text-silver-500'}`} title="Toggle auto-calc from joist depth">
                    {row.web_diagLengthAuto ? 'AUTO' : 'MAN'}
                  </button>
                </div>
              </div>
            </div>

            {/* Web Calculated Results */}
            <div className="mt-3 pt-3 border-t border-silver-100 grid grid-cols-3 lg:grid-cols-6 gap-3">
              <div><p className="text-[10px] text-silver-400">Web Welds</p><p className="text-sm font-bold text-steel-700">{fmtNum(calc.webWelds)}</p></div>
              <div><p className="text-[10px] text-silver-400">Hours</p><p className="text-sm font-bold text-fire-600">{fmtDec(calc.webHrs, 1)}</p></div>
              <div><p className="text-[10px] text-silver-400">Material</p><p className="text-sm font-bold text-steel-700">{fmt(calc.webMaterial)}</p></div>
              <div><p className="text-[10px] text-silver-400">Install Cost</p><p className="text-sm font-bold text-fire-600">{fmt(calc.webInstall)}</p></div>
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
            <div><p className="text-[10px] text-silver-400">Install</p><p className="text-sm font-bold text-white">{fmt(calc.totalInstall)}</p></div>
            <div><p className="text-[10px] text-fire-400 font-bold">$/Joist</p><p className="text-sm font-bold text-fire-400">{fmt(calc.perJoist)}</p></div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-silver-500">Notes</label>
            <input type="text" value={row.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..."
              className="w-full bg-white border border-silver-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-fire-500" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─┈ Main Page Component ─┈ */
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
    let totalWeight = 0, totalHrs = 0, totalMaterial = 0, totalInstall = 0, totalQty = 0;
    rows.forEach(r => {
      const c = calcRow(r);
      const q = Number(r.qty) || 1;
      totalQty += q;
      totalWeight += c.totalWeight;
      totalHrs += c.totalHrs * q;
      totalMaterial += c.totalMaterial;
      totalInstall += c.totalInstall;
    });
    return { totalItems: rows.length, totalQty, totalWeight, totalTons: totalWeight / 2000, totalHrs, totalMaterial, totalInstall };
  }, [rows]);

  return (
    <div className="min-h-screen bg-steel-50">
      <div className="accent-stripe h-1.5 bg-gradient-to-r from-fire-500 via-fire-600 to-steel-800" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="page-title flex items-center gap-3 text-3xl font-bold text-steel-800">
            <Grid3X3 className="h-8 w-8 text-fire-600" />
            Joist Reinforcement
          </div>
          <p className="page-subtitle mt-1 text-sm text-silver-500">
            Parametric calculator — bar, plate &amp; channel methods with automatic weld &amp; labor calculations
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
            { label: 'Install', value: fmt(summary.totalInstall) },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-silver-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-silver-500">{c.label}</p>
              <p className="mt-1 text-lg font-bold text-steel-800">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Header row labels */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-steel-700">Reinforcement Schedule</h2>
          <button onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600 focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2">
            <Plus className="h-4 w-4" />Add JR Block
          </button>
        </div>

        {/* Column labels bar */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-silver-500">
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
          <div className="rounded-xl border border-dashed border-silver-300 bg-white p-12 text-center shadow-sm">
            <Grid3X3 className="mx-auto h-12 w-12 text-silver-300" />
            <h3 className="mt-4 text-lg font-semibold text-steel-700">No joist reinforcements yet</h3>
            <p className="mt-1 text-sm text-silver-400">
              Click <span className="font-semibold text-fire-600">"Add JR Block"</span> to begin your parametric reinforcement schedule.
            </p>
          </div>
        )}

        {/* Grand Total */}
        {rows.length > 0 && (
          <div className="mt-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-steel-700">Grand Total — All JR Blocks</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              <div>
                <p className="text-xs text-silver-500">Total Weight</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmtNum(summary.totalWeight)} lbs</p>
                <p className="text-[10px] text-silver-400">{fmtDec(summary.totalTons, 2)} tons</p>
              </div>
              <div>
                <p className="text-xs text-silver-500">Total Hours</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmtDec(summary.totalHrs, 1)}</p>
                <p className="text-[10px] text-silver-400">{fmtDec(summary.totalHrs / 8, 1)} days</p>
              </div>
              <div>
                <p className="text-xs text-silver-500">Material Cost</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmt(summary.totalMaterial)}</p>
                <p className="text-[10px] text-silver-400">incl. {MATERIAL_MARKUP}x markup</p>
              </div>
              <div>
                <p className="text-xs text-silver-500">Install Cost</p>
                <p className="mt-0.5 text-lg font-bold text-steel-800">{fmt(summary.totalInstall)}</p>
                <p className="text-[10px] text-silver-400">material + labor</p>
              </div>
              <div className="rounded-lg bg-steel-800 p-3">
                <p className="text-xs text-silver-300">Grand Total</p>
                <p className="mt-0.5 text-lg font-bold text-fire-400">{fmt(summary.totalInstall)}</p>
                <p className="text-[10px] text-silver-400">all JR blocks combined</p>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-silver-200 pt-6 text-center">
          <p className="text-xs text-silver-400">
            Triple Weld Inc. &mdash; Steel Estimating Suite &mdash; Joist Reinforcement Module v2.0
          </p>
        </footer>
      </div>
    </div>
  );
}
