import { useProject } from '../context/ProjectContext'
import { calcProjectSummary, fmtCurrency, fmtNumber } from '../utils/calculations'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings,
  Table2,
  Wrench,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Weight,
  Clock,
  HardHat,
  DollarSign,
  CheckCircle2,
  Circle,
} from 'lucide-react'

const quickActions = [
  {
    title: 'Rates & Config',
    description: 'Set material rates, labour rates, and project defaults.',
    to: '/rates',
    icon: Settings,
  },
  {
    title: 'Structural Takeoff',
    description: 'Enter structural steel members, shapes, and weights.',
    to: '/structural',
    icon: Table2,
  },
  {
    title: 'Misc Metals',
    description: 'Plates, angles, channels, and custom assemblies.',
    to: '/misc-metals',
    icon: Wrench,
  },
  {
    title: 'Stairs & Railings',
    description: 'OBC-compliant stairs, guardrails, and handrails.',
    to: '/stairs',
    icon: ArrowUpDown,
  },
  {
    title: 'Summary',
    description: 'Full cost breakdown with benchmarks and totals.',
    to: '/summary',
    icon: FileSpreadsheet,
  },
  {
    title: 'Generate Quote',
    description: 'Produce a professional quote document for the client.',
    to: '/summary',
    icon: FileText,
  },
]

const projectSections = [
  { key: 'rates', label: 'Rates', check: (s) => s.projectInfo.projectName.length > 0 },
  { key: 'structural', label: 'Structural', check: (s) => s.structural.length > 0 },
  { key: 'miscMetals', label: 'Misc Metals', check: (s) => s.miscMetals.length > 0 },
  { key: 'stairs', label: 'Stairs', check: (s) => s.stairs.flights > 0 },
  { key: 'railings', label: 'Railings', check: (s) => s.railings.length > 0 },
  { key: 'softCosts', label: 'Soft Costs', check: (s) => s.softCosts.some((c) => c.rate > 0) },
]

export default function Dashboard() {
  const { state } = useProject()

  const summary = useMemo(() => calcProjectSummary(state), [state])

  const stats = [
    {
      label: 'Total Steel',
      value: fmtNumber(summary.totalWeightTons, 2),
      unit: 'tons',
      icon: Weight,
      accent: false,
    },
    {
      label: 'Fab Hours',
      value: fmtNumber(summary.totalFabHrs, 1),
      unit: 'hrs',
      icon: Clock,
      accent: false,
    },
    {
      label: 'Install Hours',
      value: fmtNumber(summary.totalInstHrs, 1),
      unit: 'hrs',
      icon: HardHat,
      accent: false,
    },
    {
      label: 'Grand Total',
      value: fmtCurrency(summary.grandTotal),
      unit: '',
      icon: DollarSign,
      accent: true,
    },
  ]

  const sectionStatus = useMemo(
    () => projectSections.map((s) => ({ ...s, filled: s.check(state) })),
    [state]
  )

  return (
    <div className="space-y-10">
      {/* ── Welcome Header ── */}
      <div>
        <h1 className="page-title">Steel Estimator Pro</h1>
        <p className="page-subtitle mt-1">
          {state.projectInfo.projectName
            ? `Project: ${state.projectInfo.projectName}`
            : 'Precision steel estimating for fabrication and erection.'}
        </p>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={
                stat.accent
                  ? 'stat-card relative overflow-hidden bg-fire-600 text-white'
                  : 'stat-card relative overflow-hidden'
              }
            >
              <div
                className={
                  stat.accent
                    ? 'mb-3 inline-flex rounded-lg bg-white/20 p-2'
                    : 'mb-3 inline-flex rounded-lg bg-fire-600/10 p-2'
                }
              >
                <Icon
                  className={
                    stat.accent ? 'h-4 w-4 text-white' : 'h-4 w-4 text-fire-600'
                  }
                />
              </div>
              <p
                className={
                  stat.accent
                    ? 'text-[10px] font-semibold uppercase tracking-widest text-white/70'
                    : 'text-[10px] font-semibold uppercase tracking-widest text-silver-500'
                }
              >
                {stat.label}
              </p>
              <p
                className={
                  stat.accent
                    ? 'number-accent mt-1 font-mono tabular-nums tracking-tight text-white'
                    : 'number-big mt-1 font-mono tabular-nums tracking-tight'
                }
              >
                {stat.value}
                {stat.unit && (
                  <span
                    className={
                      stat.accent
                        ? 'ml-1.5 text-sm font-normal text-white/60'
                        : 'ml-1.5 text-sm font-normal text-silver-500'
                    }
                  >
                    {stat.unit}
                  </span>
                )}
              </p>
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.title}
                to={action.to}
                className="card group relative flex items-start gap-4 overflow-hidden transition-shadow hover:shadow-lg hover:-translate-y-0.5 duration-200"
              >
                <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-fire-500 to-fire-400" />
                <div className="ml-2 flex-shrink-0 rounded-lg bg-fire-600/10 p-2.5">
                  <Icon className="h-5 w-5 text-fire-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-steel-900">{action.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-silver-500">{action.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Project Status</h2>
        <div className="card">
          <div className="flex flex-wrap items-center gap-6">
            {sectionStatus.map((section) => (
              <div key={section.key} className="flex items-center gap-2">
                {section.filled ? (
                  <CheckCircle2 className="h-5 w-5 text-fire-500" />
                ) : (
                  <Circle className="h-5 w-5 text-silver-200" />
                )}
                <span className={section.filled ? 'text-sm font-medium text-steel-900' : 'text-sm text-silver-500'}>
                  {section.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
