// ─── Stairs Sketch (inline SVG) — standalone component ───
const fmtNum = (v, d = 0) =>
  typeof v === 'number' && !isNaN(v)
    ? v.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '0'

// Schematic side-view of the stair: F2F height, flights, landings, angle, columns.
function StairsSketch({ geom, finish }) {
  const stroke = '#475569'
  const accent = '#dc2626'
  const muted = '#cbd5e1'
  const SW = 360
  const SH = 280
  const flights = Math.max(Math.round(geom.flights || 1), 1)
  const numLandings = Math.max(flights - 1, 0)
  const colsPerLanding = Math.max(Math.round(geom.colsPerLanding || 0), 0)
  const angleDeg = geom.angleDeg || 35
  // Layout: floor at y=240, top at y=20. Each flight occupies vertical band (220 / flights).
  const yFloor = 240
  const yTop = 20
  const totalRise = yFloor - yTop
  const flightRise = totalRise / flights
  // Horizontal: ramp width per flight. Compute from angle so flight slope matches geometry.
  // Use displayed angle clamped 25-65 for readable sketch.
  const dispAngle = Math.max(20, Math.min(angleDeg || 35, 65))
  const flightRun = flightRise / Math.tan((dispAngle * Math.PI) / 180)
  const landingW = 28
  const xStart = 40
  // Build segments: each flight goes alternating direction
  const segs = []
  let x = xStart
  let y = yFloor
  for (let i = 0; i < flights; i++) {
    const goingRight = i % 2 === 0
    const x2 = goingRight ? x + flightRun : x - flightRun
    const y2 = y - flightRise
    segs.push({ kind: 'flight', x1: x, y1: y, x2, y2, dir: goingRight ? 1 : -1 })
    x = x2
    y = y2
    if (i < flights - 1) {
      // Landing horizontal segment (after a flight, before turning)
      const xL = goingRight ? x + landingW : x - landingW
      segs.push({ kind: 'landing', x1: x, y1: y, x2: xL, y2: y })
      x = xL
    }
  }
  const xEnd = x
  // Compute bounds and shift if needed to fit
  const minX = Math.min(xStart, ...segs.map((s) => Math.min(s.x1, s.x2)))
  const maxX = Math.max(xStart, ...segs.map((s) => Math.max(s.x1, s.x2)))
  const range = maxX - minX || 1
  const targetMin = 30
  const targetMax = SW - 30
  const scale = Math.min(1, (targetMax - targetMin) / range)
  const offsetX = targetMin - minX * scale
  const tx = (px) => px * scale + offsetX
  // Build path for the stair line (zig-zag)
  let pathD = ''
  segs.forEach((seg, i) => {
    if (i === 0) pathD += `M ${tx(seg.x1)} ${seg.y1} `
    pathD += `L ${tx(seg.x2)} ${seg.y2} `
  })

  // Render rungs (small ticks perpendicular to each flight)
  const rungs = []
  segs.filter((s) => s.kind === 'flight').forEach((seg, fi) => {
    const dx = seg.x2 - seg.x1
    const dy = seg.y2 - seg.y1
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    const px = -uy
    const py = ux
    const tickLen = 6
    // Show approx 4-6 rungs per flight (just visual)
    const N = 5
    for (let k = 1; k <= N; k++) {
      const t = k / (N + 1)
      const mx = seg.x1 + dx * t
      const my = seg.y1 + dy * t
      const ax = tx(mx) + px * tickLen * 0.5
      const ay = my + py * tickLen * 0.5
      const bx = tx(mx) - px * tickLen * 0.5
      const by = my - py * tickLen * 0.5
      rungs.push(<line key={`${fi}-${k}`} x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth="1" />)
    }
  })

  // Landing columns: short vertical lines under each landing
  const cols = []
  segs.filter((s) => s.kind === 'landing').forEach((seg, li) => {
    const lx = (seg.x1 + seg.x2) / 2
    const ly = seg.y1
    const N = colsPerLanding
    for (let k = 0; k < N; k++) {
      const offset = (k - (N - 1) / 2) * 8
      cols.push(
        <line key={`c-${li}-${k}`} x1={tx(lx) + offset} y1={ly + 2} x2={tx(lx) + offset} y2={yFloor} stroke={accent} strokeWidth="1.5" strokeDasharray="2 1" />
      )
    }
  })

  // Height annotation on left side (vertical arrow)
  const yMidH = (yFloor + yTop) / 2
  // Determine end-y (where the last flight lands)
  const yFinal = segs.length ? segs[segs.length - 1].y2 : yFloor

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full max-w-[360px]" preserveAspectRatio="xMidYMid meet">
        {/* Floor */}
        <line x1="10" y1={yFloor} x2={SW - 10} y2={yFloor} stroke={stroke} strokeWidth="2" />
        <text x={SW - 15} y={yFloor + 14} textAnchor="end" fontSize="9" fill={muted}>floor</text>
        {/* Top floor (F2F) */}
        <line x1="10" y1={yFinal} x2={SW - 10} y2={yFinal} stroke={stroke} strokeWidth="2" strokeDasharray="4 3" />
        <text x={SW - 15} y={yFinal - 4} textAnchor="end" fontSize="9" fill={muted}>top floor (F2F)</text>
        {/* Height arrow */}
        <line x1="18" y1={yFloor} x2="18" y2={yFinal} stroke={accent} strokeWidth="1.5" />
        <polygon points="14,30 22,30 18,22" fill={accent} transform={`translate(0,${yFinal - 22})`} />
        <polygon points="14,232 22,232 18,240" fill={accent} transform={`translate(0,${yFloor - 240})`} />
        <text x="6" y={yMidH} fontSize="9" fill={accent} transform={`rotate(-90 6 ${yMidH})`} textAnchor="middle">
          {fmtNum(geom.f2fHeight)} mm
        </text>
        {/* Stair zig-zag */}
        <path d={pathD} stroke={stroke} strokeWidth="2.5" fill="none" />
        {/* Rungs (treads indicator) */}
        {rungs}
        {/* Landing columns */}
        {cols}
        {/* Angle marker on first flight */}
        {(() => {
          const first = segs.find((s) => s.kind === 'flight')
          if (!first) return null
          const ax = tx(first.x1)
          const ay = first.y1
          return (
            <g>
              <path d={`M ${ax + 18} ${ay} A 18 18 0 0 0 ${ax + Math.cos(((90 - dispAngle) * Math.PI) / 180) * 18} ${ay - Math.sin(((90 - dispAngle) * Math.PI) / 180) * 18}`} stroke={accent} strokeWidth="1" fill="none" />
              <text x={ax + 25} y={ay - 6} fontSize="9" fill={accent}>{fmtNum(angleDeg, 1)}°</text>
            </g>
          )
        })()}
        {/* Flight & landing labels */}
        {segs.filter((s) => s.kind === 'flight').map((seg, i) => {
          const lx = (tx(seg.x1) + tx(seg.x2)) / 2
          const ly = (seg.y1 + seg.y2) / 2
          return (
            <text key={`fl-${i}`} x={lx} y={ly - 4} fontSize="9" fill={stroke} textAnchor="middle">
              F{i + 1}
            </text>
          )
        })}
        {segs.filter((s) => s.kind === 'landing').map((seg, i) => {
          const lx = (tx(seg.x1) + tx(seg.x2)) / 2
          const ly = seg.y1
          return (
            <text key={`ln-${i}`} x={lx} y={ly - 4} fontSize="8" fill={muted} textAnchor="middle">
              L{i + 1}
            </text>
          )
        })}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-steel-700">
        <span>F2F: <strong>{fmtNum(geom.f2fHeight)} mm</strong></span>
        <span>Angle: <strong>{fmtNum(geom.angleDeg, 1)}°</strong></span>
        <span>Flights: <strong>{flights}</strong></span>
        <span>Landings: <strong>{numLandings}</strong></span>
        <span>Risers/flight: <strong>{fmtNum(geom.risersPerFlight)}</strong></span>
        <span>Cols/landing: <strong>{colsPerLanding}</strong></span>
      </div>
      <p className="mt-1 text-[10px] text-silver-500">{finish === 'Galvanized' ? '· Galvanized finish' : '· Shop primed'}</p>
    </div>
  )
}


export default StairsSketch
