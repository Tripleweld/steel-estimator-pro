import { useMemo, useState } from 'react'
import { Wrench, Hammer, Search, RotateCcw, Tag, AlertTriangle } from 'lucide-react'
import { useProject } from '../context/ProjectContext.jsx'
import standards from '../data/fabInstallStandards.json'

const FAB_HOUR_FIELDS = [
  { key: 'setup', label: 'Setup' },
  { key: 'cut', label: 'Cut' },
  { key: 'drill', label: 'Drill' },
  { key: 'bend', label: 'Bend' },
  { key: 'weld', label: 'Weld' },
  { key: 'grind', label: 'Grind' },
]

const fmt = (v) => (v == null || isNaN(Number(v))) ? '0.00' : Number(v).toFixed(2)

function HeaderCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-steel-700 bg-steel-900/50 p-5 mb-4 shadow-lg">
      <div className="flex items-start gap-3 mb-3">
        {Icon && <div className="flex-shrink-0 rounded-lg bg-fire-500/15 p-2"><Icon className="w-5 h-5 text-fire-400" /></div>}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-steel-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function NumCell({ value, factory, onChange, onReset }) {
  const overridden = value !== undefined && value !== null && Number(value) !== Number(factory)
  const display = value !== undefined && value !== null ? value : factory
  return (
    <div className="relative inline-flex items-center group">
      <input
        type="number"
        step="0.05"
        min="0"
        value={display ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`w-20 rounded border bg-steel-950 px-2 py-1 text-xs font-mono text-right outline-none transition focus:ring-1 ${overridden ? 'border-blue-500 text-blue-300 ring-blue-500/30' : 'border-steel-700 text-steel-300'}`}
      />
      {overridden && (
        <button type="button" onClick={onReset} title={`Reset to factory (${fmt(factory)})`} className="absolute -right-5 text-steel-500 hover:text-fire-400 transition opacity-0 group-hover:opacity-100">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function FabRow({ row, override, onUpdate, onReset }) {
  const isOverridden = override && Object.keys(override).length > 0
  const get = (k) => override && override[k] !== undefined ? override[k] : row[k]
  return (
    <tr className={`border-b border-steel-800 transition ${isOverridden ? 'bg-blue-950/15' : 'hover:bg-steel-900/40'}`}>
      <td className="px-3 py-2 text-xs">
        <div className="font-medium text-white">{row.memberType}</div>
        <div className="text-steel-500 font-mono text-[10px]">{row.profile}</div>
      </td>
      <td className="px-3 py-2 text-xs text-steel-400">{row.complexity}</td>
      <td className="px-2 py-2">
        <NumCell
          value={override?.crew}
          factory={row.crew}
          onChange={(v) => onUpdate({ crew: v })}
          onReset={() => onUpdate({ crew: undefined })}
        />
      </td>
      {FAB_HOUR_FIELDS.map((f) => (
        <td key={f.key} className="px-2 py-2">
          <NumCell
            value={override?.[f.key]}
            factory={row[f.key]}
            onChange={(v) => onUpdate({ [f.key]: v })}
            onReset={() => onUpdate({ [f.key]: undefined })}
          />
        </td>
      ))}
      <td className="px-3 py-2 text-right text-xs font-mono font-bold text-fire-400">
        {fmt(FAB_HOUR_FIELDS.reduce((s, f) => s + Number(get(f.key) || 0), 0) * Number(get('crew') || 1))}
      </td>
      <td className="px-2 py-2 text-center">
        {isOverridden && (
          <button type="button" onClick={onReset} title="Reset row to factory" className="text-steel-500 hover:text-red-400 transition px-1">
            <RotateCcw className="w-3 h-3 inline" />
          </button>
        )}
      </td>
    </tr>
  )
}

function InstallRow({ row, override, onUpdate, onReset }) {
  const isOverridden = override && Object.keys(override).length > 0
  const get = (k) => override && override[k] !== undefined ? override[k] : row[k]
  const totalCrewHrs = Number(get('hrsPerPerson') || 0) * Number(get('crew') || 1)
  const adjHrs = totalCrewHrs * Number(get('prodFactor') || 1)
  return (
    <tr className={`border-b border-steel-800 transition ${isOverridden ? 'bg-blue-950/15' : 'hover:bg-steel-900/40'}`}>
      <td className="px-3 py-2 text-xs">
        <div className="font-medium text-white">{row.memberType}</div>
        <div className="text-steel-500 text-[10px]">{row.weightRange} · {row.heightCondition}</div>
      </td>
      <td className="px-2 py-2">
        <NumCell value={override?.crew} factory={row.crew} onChange={(v) => onUpdate({ crew: v })} onReset={() => onUpdate({ crew: undefined })} />
      </td>
      <td className="px-2 py-2">
        <NumCell value={override?.hrsPerPerson} factory={row.hrsPerPerson} onChange={(v) => onUpdate({ hrsPerPerson: v })} onReset={() => onUpdate({ hrsPerPerson: undefined })} />
      </td>
      <td className="px-3 py-2 text-right text-xs font-mono text-amber-300">{fmt(totalCrewHrs)}</td>
      <td className="px-2 py-2">
        <NumCell value={override?.prodFactor} factory={row.prodFactor} onChange={(v) => onUpdate({ prodFactor: v })} onReset={() => onUpdate({ prodFactor: undefined })} />
      </td>
      <td className="px-3 py-2 text-right text-xs font-mono font-bold text-fire-400">{fmt(adjHrs)}</td>
      <td className="px-3 py-2 text-[10px] text-steel-400">{row.equipment}</td>
      <td className="px-2 py-2 text-center">
        {isOverridden && (
          <button type="button" onClick={onReset} title="Reset row to factory" className="text-steel-500 hover:text-red-400 transition px-1">
            <RotateCcw className="w-3 h-3 inline" />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function FabInstallStandards() {
  const { state, dispatch } = useProject()
  const [tab, setTab] = useState('fab')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')

  const fabOverrides = state.fabStandardOverrides || {}
  const installOverrides = state.installStandardOverrides || {}

  const fabCategories = useMemo(() => ['All', ...Array.from(new Set(standards.fab.map((r) => r.category)))], [])
  const installCategories = useMemo(() => ['All', ...Array.from(new Set(standards.install.map((r) => r.category)))], [])

  const fabFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return standards.fab.filter((r) => (filterCat === 'All' || r.category === filterCat) && (q === '' || r.memberType.toLowerCase().includes(q) || r.profile.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)))
  }, [search, filterCat])

  const installFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return standards.install.filter((r) => (filterCat === 'All' || r.category === filterCat) && (q === '' || r.memberType.toLowerCase().includes(q) || (r.weightRange || '').toLowerCase().includes(q) || r.category.toLowerCase().includes(q)))
  }, [search, filterCat])

  const updateFab = (id, changes) => dispatch({ type: 'UPDATE_FAB_STANDARD', payload: { id, changes } })
  const resetFab = (id) => dispatch({ type: 'RESET_FAB_STANDARD', payload: { id } })
  const updateInstall = (id, changes) => dispatch({ type: 'UPDATE_INSTALL_STANDARD', payload: { id, changes } })
  const resetInstall = (id) => dispatch({ type: 'RESET_INSTALL_STANDARD', payload: { id } })

  const overriddenFabCount = Object.keys(fabOverrides).filter((k) => fabOverrides[k] && Object.keys(fabOverrides[k]).length > 0).length
  const overriddenInstallCount = Object.keys(installOverrides).filter((k) => installOverrides[k] && Object.keys(installOverrides[k]).length > 0).length

  const groupedFab = useMemo(() => {
    const out = {}
    fabFiltered.forEach((r) => { if (!out[r.category]) out[r.category] = []; out[r.category].push(r) })
    return out
  }, [fabFiltered])

  const groupedInstall = useMemo(() => {
    const out = {}
    installFiltered.forEach((r) => { if (!out[r.category]) out[r.category] = []; out[r.category].push(r) })
    return out
  }, [installFiltered])

  const categories = tab === 'fab' ? fabCategories : installCategories

  return (
    <div className="bg-steel-950 min-h-screen">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="rounded-lg bg-fire-500/15 p-2"><Wrench className="w-6 h-6 text-fire-400" /></span>
          Fab &amp; Install Standards
        </h1>
        <p className="text-sm text-steel-400 mt-1">Reference fabrication and installation hours per piece by member type. Edit values to calibrate to your shop&apos;s actual productivity. Modified rows are highlighted in blue and can be reset to factory defaults.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => { setTab('fab'); setFilterCat('All') }} className={`px-4 py-2 rounded-t-lg text-sm font-bold transition ${tab === 'fab' ? 'bg-steel-800 text-fire-400 border-t border-l border-r border-steel-700' : 'text-steel-400 hover:text-white'}`}>
          <Wrench className="w-4 h-4 inline mr-1.5" /> Fab Standards <span className="text-xs text-steel-500 ml-1">({standards.fab.length})</span>
          {overriddenFabCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">{overriddenFabCount} edited</span>}
        </button>
        <button type="button" onClick={() => { setTab('install'); setFilterCat('All') }} className={`px-4 py-2 rounded-t-lg text-sm font-bold transition ${tab === 'install' ? 'bg-steel-800 text-fire-400 border-t border-l border-r border-steel-700' : 'text-steel-400 hover:text-white'}`}>
          <Hammer className="w-4 h-4 inline mr-1.5" /> Install Standards <span className="text-xs text-steel-500 ml-1">({standards.install.length})</span>
          {overriddenInstallCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">{overriddenInstallCount} edited</span>}
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-steel-900/50 border border-steel-700 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase text-steel-500 mb-1 block">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-steel-500 absolute left-2.5 top-2.5" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Member type, profile, weight range..." className="w-full pl-8 pr-3 py-2 rounded border border-steel-700 bg-steel-950 text-white text-sm outline-none focus:border-fire-500/50" />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase text-steel-500 mb-1 block">Category</label>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="rounded border border-steel-700 bg-steel-950 text-white text-sm px-3 py-2 outline-none focus:border-fire-500/50 min-w-[200px]">
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-steel-500 mb-1 block">Bulk</label>
          <button type="button" onClick={() => { if (window.confirm('Reset ALL fab and install standards to factory defaults? This will discard your edits.')) dispatch({ type: 'RESET_ALL_STANDARDS' }) }} className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-bold hover:bg-red-500/20 transition flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" /> Reset all to factory
          </button>
        </div>
      </div>

      {/* Productivity Factors helper */}
      {tab === 'install' && (
        <HeaderCard icon={AlertTriangle} title="Productivity Factor reference" subtitle="Site-condition multipliers applied to install hours">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {standards.productivityFactors.map((p) => (
              <div key={p.label} className="rounded border border-steel-700 bg-steel-950 px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-fire-400 text-sm font-mono">{p.value.toFixed(2)}x</span>
                  <span className="text-white text-sm font-medium">{p.label}</span>
                </div>
                <div className="text-[10px] text-steel-400 mt-0.5">{p.description}</div>
              </div>
            ))}
          </div>
        </HeaderCard>
      )}

      {/* Tables */}
      {tab === 'fab' ? (
        Object.keys(groupedFab).length === 0 ? (
          <div className="rounded-lg border border-steel-700 bg-steel-900/30 p-8 text-center">
            <p className="text-steel-300">No fab standards match your filters.</p>
          </div>
        ) : (
          Object.entries(groupedFab).map(([cat, rows]) => (
            <HeaderCard key={cat} icon={Tag} title={cat} subtitle={`${rows.length} item${rows.length !== 1 ? 's' : ''} · hours per piece (per person)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-steel-800 text-white">
                      <th className="rounded-tl-lg px-3 py-2 text-left font-bold uppercase tracking-wider">Member / Profile</th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Complexity</th>
                      <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Crew</th>
                      {FAB_HOUR_FIELDS.map((f) => (<th key={f.key} className="px-2 py-2 text-center font-bold uppercase tracking-wider">{f.label}</th>))}
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Total hrs</th>
                      <th className="rounded-tr-lg px-2 py-2 text-center font-bold uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <FabRow key={r.id} row={r} override={fabOverrides[r.id]} onUpdate={(c) => updateFab(r.id, c)} onReset={() => resetFab(r.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </HeaderCard>
          ))
        )
      ) : (
        Object.keys(groupedInstall).length === 0 ? (
          <div className="rounded-lg border border-steel-700 bg-steel-900/30 p-8 text-center">
            <p className="text-steel-300">No install standards match your filters.</p>
          </div>
        ) : (
          Object.entries(groupedInstall).map(([cat, rows]) => (
            <HeaderCard key={cat} icon={Tag} title={cat} subtitle={`${rows.length} item${rows.length !== 1 ? 's' : ''} · install hours per piece (per person)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-steel-800 text-white">
                      <th className="rounded-tl-lg px-3 py-2 text-left font-bold uppercase tracking-wider">Member / Range</th>
                      <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Crew</th>
                      <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Hrs/pp</th>
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Crew-hrs</th>
                      <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Prod factor</th>
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Adj hrs</th>
                      <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Equipment</th>
                      <th className="rounded-tr-lg px-2 py-2 text-center font-bold uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <InstallRow key={r.id} row={r} override={installOverrides[r.id]} onUpdate={(c) => updateInstall(r.id, c)} onReset={() => resetInstall(r.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </HeaderCard>
          ))
        )
      )}
    </div>
  )
}
