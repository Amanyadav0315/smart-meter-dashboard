import { useState, useEffect, useMemo, useCallback, FC, ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RotateCw, Settings, Sun, Moon } from 'lucide-react'
import { useDashboard, type DistrictRow, type MeterTypeRow, type DailyUpdate } from './context/DashboardContext'
import { useTheme } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import tataPowerLogo from './assets/tata-power-ddl-logo.svg'
import SignIn from './components/auth/SignIn'
import SignUp from './components/auth/SignUp'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

interface NameValueColor {
  name: string
  value: number
  color: string
}

type TabId = 'overview' | 'district' | 'metertype' | 'ageing' | 'updates'
type SortDir = 'asc' | 'desc'

/* ═══════════════════════════════════════════════════
   DATA CONSTANTS
═══════════════════════════════════════════════════ */

const SOURCE_DATA: NameValueColor[] = [
  { name:'L+G (Landis+Gyr)', value:322330, color:'#3b82f6' },
  { name:'FG (Genus)',        value:323972, color:'#f59e0b' },
]

const STATUS_DATA: NameValueColor[] = [
  { name:'Active',              value:637472, color:'#10b981' },
  { name:'TD (Tamper Detected)',value:8830,   color:'#ef4444' },
]

const COMM_TECH = [
  { tech:'RF Mesh', meters:380000, pct:58.8, color:'#3b82f6' },
  { tech:'NB-IoT',  meters:160000, pct:24.8, color:'#8b5cf6' },
  { tech:'4G/LTE',  meters:106302, pct:16.4, color:'#ec4899' },
]

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */

const fmt = (n: number): string =>
  n >= 1e5 ? (n / 1e5).toFixed(2) + 'L'
  : n >= 1000 ? (n / 1000).toFixed(1) + 'K'
  : String(n)

const fmtFull = (n: number | undefined): string =>
  n !== undefined ? n.toLocaleString('en-IN') : '—'

const perfColor = (p: number): string =>
  p >= 90 ? '#10b981' : p >= 85 ? '#3b82f6' : p >= 80 ? '#f59e0b' : '#ef4444'

const perfBg = (p: number): string =>
  p >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  : p >= 85 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  : p >= 80 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  : 'bg-red-500/20 text-red-300 border-red-500/30'

const uid = () => Math.random().toString(36).slice(2, 9)

const resolveThemeDark = (isDark?: boolean): boolean => {
  if (typeof isDark === 'boolean') return isDark
  if (typeof document === 'undefined') return true
  return document.documentElement.classList.contains('dark')
}

/* ═══════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════ */

interface KPIProps {
  label: string
  value: ReactNode
  sub?: string
  color?: string
  icon: string
  trend?: number
  isDark?: boolean
}
const KPICard: FC<KPIProps> = ({ label, value, sub, color = '#3b82f6', icon, trend, isDark }) => {
  const dark = resolveThemeDark(isDark)
  return (
  <div className={`relative overflow-hidden rounded-2xl border p-6 panel-glass human-card group transition-all duration-300 ${
    dark 
      ? 'border-slate-700/70 bg-slate-900/55 hover:border-slate-500/80' 
      : 'border-slate-300 bg-white/90 hover:border-slate-400'
  }`}>
    <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
    <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20" style={{ background: color }} />
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] mb-2 ${dark ? 'text-slate-400' : 'text-black'}`}>{label}</p>
        <p className={`text-2xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </p>
        {sub && <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-slate-400' : 'text-black'}`}>{sub}</p>}
        {trend !== undefined && (
          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}% vs prev
          </div>
        )}
      </div>
      <div className={`text-2xl opacity-60 ml-3 mt-0.5 ${dark ? 'text-white' : 'text-slate-900'}`}>{icon}</div>
    </div>
  </div>
)
}

const ChartTip: FC<TooltipProps<ValueType, NameType> & { isDark?: boolean }> = ({ active, payload, label, isDark }) => {
  const dark = resolveThemeDark(isDark)
  if (!active || !payload?.length) return null
  return (
    <div className={`rounded-xl border backdrop-blur-xl p-3 text-xs shadow-2xl min-w-[140px] ${
      dark 
        ? 'border-white/10 bg-slate-950/95' 
        : 'border-slate-300 bg-white/95'
    }`}>
      <p className={`font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (p.fill ?? p.color) as string }} />
          <span className={`flex-1 truncate ${dark ? 'text-slate-400' : 'text-black'}`}>{p.name}:</span>
          <span className={`font-mono ml-1 ${dark ? 'text-white' : 'text-slate-900'}`}>{fmtFull(p.value as number)}</span>
        </div>
      ))}
    </div>
  )
}

const Badge: FC<{ v: number; isDark?: boolean }> = ({ v, isDark }) => {
  const dark = resolveThemeDark(isDark)
  return (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
    dark ? perfBg(v) : 'bg-white text-black border-slate-400'
  }`}>
    {v}%
  </span>
)
}

const ChartCard: FC<{ title: string; children: ReactNode; className?: string; isDark?: boolean }> = ({ title, children, className = '', isDark }) => {
  const dark = resolveThemeDark(isDark)
  return (
  <div className={`rounded-3xl border p-5 panel-glass human-card animate-rise ${className} ${
    dark
      ? 'border-slate-700/70 bg-gradient-to-br from-slate-900/65 to-slate-900/35'
      : 'border-slate-200 bg-gradient-to-br from-white/95 to-slate-50/90'
  }`}>
    <h3 className={`text-[11px] font-bold tracking-[0.14em] uppercase mb-4 ${
      dark ? 'text-slate-500' : 'text-black'
    }`}>{title}</h3>
    {children}
  </div>
)
}

const FilterSelect: FC<{ value: string; onChange: (v: string) => void; options: string[]; label: string; isDark?: boolean }> = ({ value, onChange, options, label, isDark }) => {
  const dark = resolveThemeDark(isDark)
  return (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500/50 cursor-pointer border transition-colors ${
      dark
        ? 'bg-slate-900/70 border-slate-600 text-slate-200'
        : 'bg-white border-slate-300 text-black'
    }`}
  >
    <option value="">{label}</option>
    {options.map(o => <option key={o} value={o} style={{ background: dark ? '#0f172a' : '#f8fafc' }}>{o}</option>)}
  </select>
)
}

/* ═══════════════════════════════════════════════════
   OVERVIEW VIEW
═══════════════════════════════════════════════════ */

const OverviewView: FC<{ districts: DistrictRow[]; meterTypes: MeterTypeRow[]; isDark?: boolean }> = ({ districts, meterTypes, isDark = true }) => {
  const totalMeters = districts.reduce((s, d) => s + d.total, 0)
  const totalD1     = districts.reduce((s, d) => s + d.d1, 0)
  const totalNever  = districts.reduce((s, d) => s + d.never, 0)
  const avgPct      = districts.length
    ? (districts.reduce((s, d) => s + d.pct, 0) / districts.length).toFixed(2)
    : '0'

  // Theme-aware ChartTip for this view
  const ThemedChartTip: FC<TooltipProps<ValueType, NameType>> = (props) => <ChartTip {...props} isDark={isDark} />

  const radarData = districts.map(d => ({
    district: d.district.split(' ')[0],
    performance: d.pct,
    fullMark: 100,
  }))

  const bucketBar = [
    { bucket:'1 Day',      count: totalD1,                                    color:'#10b981' },
    { bucket:'2-5 Days',   count: districts.reduce((s,d)=>s+d.d2_5,0),       color:'#3b82f6' },
    { bucket:'6-30 Days',  count: districts.reduce((s,d)=>s+d.d6_30,0),      color:'#f59e0b' },
    { bucket:'31-90 Days', count: districts.reduce((s,d)=>s+d.d31_90,0),     color:'#f97316' },
    { bucket:'>180 Days',  count: districts.reduce((s,d)=>s+d.d180,0),       color:'#7c3aed' },
    { bucket:'Never',      count: totalNever,                                  color:'#475569' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Total Smart Meters"  value={fmt(totalMeters)}  sub={`${districts.length} districts monitored`}               color="#3b82f6" icon="⚡" isDark={isDark} />
        <KPICard label="Communicated Today"  value={fmt(totalD1)}      sub={`${((totalD1/totalMeters)*100).toFixed(1)}% of total`}    color="#10b981" icon="✅" trend={0.41} isDark={isDark} />
        <KPICard label="Silent / Never"      value={fmtFull(totalNever)} sub="Require field inspection"                              color="#ef4444" icon="🔇" trend={-0.03} isDark={isDark} />
        <KPICard label="Network Performance" value={`${avgPct}%`}      sub="Avg across all districts"                                color="#8b5cf6" icon="📡" isDark={isDark} />
      </div>

      {/* Comm Tech Pills */}
      <div className="grid grid-cols-3 gap-3">
        {COMM_TECH.map(t => (
          <div key={t.tech} className={`rounded-2xl border p-4 flex items-center gap-3 ${
            isDark ? 'border-white/8 bg-white/3' : 'border-slate-300 bg-slate-100'
          }`}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <div>
              <p className={`text-[10px] font-semibold tracking-widest uppercase ${
                isDark ? 'text-slate-500' : 'text-black'
              }`}>{t.tech}</p>
              <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-black'}`} style={{ fontFamily: "'Space Grotesk', monospace" }}>{fmt(t.meters)}</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-black'}`}>{t.pct}% of fleet</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stacked Bar */}
      <ChartCard title="District-wise Communication Ageing Breakdown">
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={districts} margin={{ top:4, right:8, bottom:70, left:8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="district" tick={{ fill:'#475569', fontSize:9 }} angle={-38} textAnchor="end" interval={0} />
            <YAxis tick={{ fill:'#475569', fontSize:9 }} tickFormatter={fmt} />
            <Tooltip content={<ThemedChartTip />} />
            <Bar dataKey="d1"      name="1 Day"       stackId="a" fill="#10b981" />
            <Bar dataKey="d2_5"    name="2-5 Days"    stackId="a" fill="#3b82f6" />
            <Bar dataKey="d6_30"   name="6-30 Days"   stackId="a" fill="#f59e0b" />
            <Bar dataKey="d31_90"  name="31-90 Days"  stackId="a" fill="#f97316" />
            <Bar dataKey="d91_180" name="91-180 Days" stackId="a" fill="#ef4444" />
            <Bar dataKey="d180"    name=">180 Days"   stackId="a" fill="#7c3aed" />
            <Bar dataKey="never"   name="Never"       stackId="a" fill="#1e293b" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Performance + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Performance Ranking by District">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={[...districts].sort((a,b) => b.pct - a.pct)}
              layout="vertical"
              margin={{ left:78, right:24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" domain={[60,100]} tick={{ fill:'#475569', fontSize:9 }} tickFormatter={(v:number) => `${v}%`} />
              <YAxis type="category" dataKey="district" tick={{ fill:'#475569', fontSize:9 }} width={76} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="pct" name="Performance %" radius={[0,4,4,0]}>
                {[...districts].sort((a,b) => b.pct-a.pct).map((d,i) => (
                  <Cell key={i} fill={perfColor(d.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Network Coverage Radar">
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData} margin={{ top:10, right:28, bottom:10, left:28 }}>
              <PolarGrid stroke="#ffffff10" />
              <PolarAngleAxis dataKey="district" tick={{ fill:'#475569', fontSize:8 }} />
              <Radar name="Performance %" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={1.5} />
              <Tooltip content={<ChartTip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bucket + Meter type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Communication Bucket Distribution">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={bucketBar} margin={{ left:8, right:8, bottom:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="bucket" tick={{ fill:'#475569', fontSize:9 }} />
              <YAxis tick={{ fill:'#475569', fontSize:9 }} tickFormatter={fmt} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Meters" radius={[5,5,0,0]}>
                {bucketBar.map((b,i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Meter Type Fleet Composition">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={meterTypes} dataKey="total" nameKey="type" cx="50%" cy="50%"
                innerRadius={48} outerRadius={78} paddingAngle={3}
                label={({ type, percent }: { type:string; percent:number }) =>
                  `${type.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                labelLine={{ stroke:'#ffffff15' }} fontSize={8}>
                {meterTypes.map((m,i) => <Cell key={i} fill={m.color} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   DISTRICTS VIEW
═══════════════════════════════════════════════════ */

interface DistrictViewProps {
  districts: DistrictRow[]
  selected: string
  setSelected: (d: string) => void
  isDark?: boolean
}

const DistrictView: FC<DistrictViewProps> = ({ districts, selected, setSelected, isDark = true }) => {
  const [filterPct, setFilterPct] = useState('')
  const [sortKey, setSortKey]   = useState<keyof DistrictRow>('pct')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let rows = [...districts]
    if (filterPct === 'high')   rows = rows.filter(d => d.pct >= 90)
    if (filterPct === 'medium') rows = rows.filter(d => d.pct >= 80 && d.pct < 90)
    if (filterPct === 'low')    rows = rows.filter(d => d.pct < 80)
    return rows.sort((a,b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [districts, filterPct, sortKey, sortDir])

  const d = districts.find(x => x.district === selected) ?? districts[0]
  if (!d) return null

  const ageData = [
    { bucket:'1 Day',       value:d.d1,      color:'#10b981' },
    { bucket:'2-5 Days',    value:d.d2_5,    color:'#3b82f6' },
    { bucket:'6-30 Days',   value:d.d6_30,   color:'#f59e0b' },
    { bucket:'31-90 Days',  value:d.d31_90,  color:'#f97316' },
    { bucket:'91-180 Days', value:d.d91_180, color:'#ef4444' },
    { bucket:'>180 Days',   value:d.d180,    color:'#7c3aed' },
    { bucket:'Never',       value:d.never,   color:'#475569' },
  ]

  const handleSort = (k: keyof DistrictRow) => {
    if (sortKey === k) setSortDir(p => p === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const TH: FC<{ label: string; k: keyof DistrictRow }> = ({ label, k }) => (
    <th onClick={() => handleSort(k)}
      className={`text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap select-none transition-colors ${
        isDark ? 'text-slate-500 hover:text-white' : 'text-black hover:text-black'
      }`}>
      {label}{sortKey === k && <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="space-y-5">
      {/* District selector chips */}
      <div className="flex flex-wrap gap-2">
        {districts.map(dd => (
          <button key={dd.id} onClick={() => setSelected(dd.district)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
              selected === dd.district
                ? isDark
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-blue-200 border-blue-400 text-black shadow-lg shadow-blue-500/15'
                : isDark
                  ? 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8 hover:text-white'
                  : 'bg-slate-100 border-slate-300 text-black hover:bg-slate-200 hover:text-black'
            }`}>
            {dd.district.split(' ').map(w => w[0]).join('')}
            <span className="ml-1.5 opacity-60">{dd.pct}%</span>
          </button>
        ))}
      </div>

      {/* Selected district detail */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-black'}`}>{d.district}</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-black'}`}>Last updated: {d.lastUpdated}</p>
          </div>
          <Badge v={d.pct} isDark={isDark} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPICard label="Total Meters" value={fmtFull(d.total)}   sub="Installed"                                                    color="#3b82f6" icon="📟" isDark={isDark} />
          <KPICard label="Active 1-Day" value={fmtFull(d.d1)}      sub={`${((d.d1/d.total)*100).toFixed(1)}% communicating`}          color="#10b981" icon="✅" isDark={isDark} />
          <KPICard label="Never Comm."  value={fmtFull(d.never)}   sub={`${((d.never/d.total)*100).toFixed(1)}% — needs inspection`}  color="#ef4444" icon="🔇" isDark={isDark} />
          <KPICard label="Clock Drift"  value={fmtFull(d.drift)}   sub="Time sync issues"                                             color="#6b7280" icon="⏰" isDark={isDark} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Ageing Pie Chart">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={ageData} dataKey="value" nameKey="bucket" cx="50%" cy="50%"
                  outerRadius={88}
                  label={({ bucket, percent }: { bucket:string; percent:number }) =>
                    `${bucket} ${(percent*100).toFixed(1)}%`}
                  labelLine={{ stroke:'#ffffff15' }} fontSize={8}>
                  {ageData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Bucket Count Bar">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={ageData} margin={{ top:4, right:8, bottom:42, left:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="bucket" tick={{ fill: isDark ? '#475569' : '#000000', fontSize:8 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill: isDark ? '#475569' : '#000000', fontSize:9 }} tickFormatter={fmt} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Meters" radius={[4,4,0,0]}>
                  {ageData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Comparison table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/3' : 'border-slate-300 bg-slate-50'}`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-white/8' : 'border-slate-300'}`}>
          <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>All Districts Comparison <span className={`font-normal ${isDark ? 'text-slate-600' : 'text-black'}`}>(click headers to sort)</span></p>
          <FilterSelect value={filterPct} onChange={setFilterPct}
            options={['high','medium','low']} label="Filter by performance" isDark={isDark} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/8' : 'border-slate-300'}`}>
                <TH label="District" k="district" />
                <TH label="Total"    k="total" />
                <TH label="1 Day"    k="d1" />
                <TH label="2-5D"     k="d2_5" />
                <TH label="6-30D"    k="d6_30" />
                <TH label="31-90D"   k="d31_90" />
                <TH label=">180D"    k="d180" />
                <TH label="Never"    k="never" />
                <TH label="Perf %"   k="pct" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id}
                  onClick={() => setSelected(row.district)}
                  className={`border-b cursor-pointer transition-colors ${
                    isDark
                      ? 'border-white/4 hover:bg-white/4'
                      : 'border-slate-300 hover:bg-slate-200'
                  } ${
                    selected === row.district ? 'bg-blue-500/10' : ''
                  }`}>
                  <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{row.district}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-300' : 'text-black'}`}>{fmtFull(row.total)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-emerald-400' : 'text-black'}`}>{fmtFull(row.d1)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-blue-400' : 'text-black'}`}>{fmtFull(row.d2_5)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-amber-400' : 'text-black'}`}>{fmtFull(row.d6_30)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-orange-400' : 'text-black'}`}>{fmtFull(row.d31_90)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-purple-400' : 'text-black'}`}>{fmtFull(row.d180)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-500' : 'text-black'}`}>{fmtFull(row.never)}</td>
                  <td className="py-2.5 px-3"><Badge v={row.pct} isDark={isDark} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   METER TYPES VIEW
═══════════════════════════════════════════════════ */

const MeterTypeView: FC<{ meterTypes: MeterTypeRow[]; isDark?: boolean }> = ({ meterTypes, isDark = true }) => {
  const [selected, setSelected] = useState<string | null>(null)
  const sel = meterTypes.find(m => m.type === selected)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {meterTypes.map(m => (
          <button key={m.id} onClick={() => setSelected(selected === m.type ? null : m.type)}
            className="rounded-2xl p-4 text-left border transition-all"
            style={selected === m.type
              ? { borderColor: m.color, background: `${m.color}18`, boxShadow: `0 0 24px ${m.color}28` }
              : { borderColor:'rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)' }}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-black'}`}>{m.type}</p>
            <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-black'}`} style={{ fontFamily:"'Space Mono',monospace" }}>{fmt(m.total)}</p>
            <div className="mt-2"><Badge v={m.pct} isDark={isDark} /></div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="rounded-2xl border p-5" style={{ borderColor:`${sel.color}30`, background:`${sel.color}08` }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-black'}`}>{sel.type} — Detail</h3>
            <button onClick={() => setSelected(null)} className={`text-xs transition-colors ${isDark ? 'text-slate-500 hover:text-white' : 'text-black hover:text-black'}`}>✕ close</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Total"       value={fmtFull(sel.total)}  color={sel.color}         icon="📊" isDark={isDark} />
            <KPICard label="1-Day Active" value={fmtFull(sel.d1)}    color="#10b981"           icon="✅" isDark={isDark} />
            <KPICard label="Never Comm." value={fmtFull(sel.never)}  color="#ef4444"           icon="🔇" isDark={isDark} />
            <KPICard label="Performance" value={`${sel.pct}%`}       color={perfColor(sel.pct)} icon="📈" isDark={isDark} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Fleet Size by Meter Type">
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={meterTypes} dataKey="total" nameKey="type" cx="50%" cy="50%"
                innerRadius={52} outerRadius={96} paddingAngle={3}
                label={({ type, percent }: { type:string; percent:number }) =>
                  `${type.split(' ')[0]} ${(percent*100).toFixed(1)}%`}
                fontSize={9}>
                {meterTypes.map((m,i) => <Cell key={i} fill={m.color} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Performance % by Meter Type">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={meterTypes} margin={{ left:8, right:8, bottom:56 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="type" tick={{ fill: isDark ? '#475569' : '#000000', fontSize:9 }} angle={-28} textAnchor="end" interval={0} />
              <YAxis domain={[60,100]} tick={{ fill: isDark ? '#475569' : '#000000', fontSize:9 }} tickFormatter={(v:number) => `${v}%`} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="pct" name="Performance %" radius={[4,4,0,0]}>
                {meterTypes.map((m,i) => <Cell key={i} fill={m.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Ageing Comparison Across All Meter Types">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={meterTypes} margin={{ left:8, right:8, bottom:56 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="type" tick={{ fill: isDark ? '#475569' : '#000000', fontSize:9 }} angle={-28} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: isDark ? '#475569' : '#000000', fontSize:9 }} tickFormatter={fmt} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize:9, color: isDark ? '#64748b' : '#000000', paddingTop:4 }} />
            <Bar dataKey="d1"    name="1 Day"     stackId="a" fill="#10b981" />
            <Bar dataKey="d2_5"  name="2-5 Days"  stackId="a" fill="#3b82f6" />
            <Bar dataKey="d6_30" name="6-30 Days"  stackId="a" fill="#f59e0b" />
            <Bar dataKey="gt30"  name=">30 Days"   stackId="a" fill="#ef4444" />
            <Bar dataKey="never" name="Never"      stackId="a" fill="#1e293b" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   AGEING VIEW
═══════════════════════════════════════════════════ */

const AgeingView: FC<{ districts: DistrictRow[]; isDark?: boolean }> = ({ districts, isDark = true }) => {
  const [districtFilter, setDistrictFilter] = useState('')
  const [sortKey, setSortKey] = useState<keyof DistrictRow>('pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let rows = districtFilter ? districts.filter(d => d.district === districtFilter) : [...districts]
    return rows.sort((a,b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [districts, districtFilter, sortKey, sortDir])

  const totals = useMemo(() => ({
    d1:      districts.reduce((s,d)=>s+d.d1,0),
    d2_5:    districts.reduce((s,d)=>s+d.d2_5,0),
    d6_30:   districts.reduce((s,d)=>s+d.d6_30,0),
    d31_90:  districts.reduce((s,d)=>s+d.d31_90,0),
    d91_180: districts.reduce((s,d)=>s+d.d91_180,0),
    d180:    districts.reduce((s,d)=>s+d.d180,0),
    never:   districts.reduce((s,d)=>s+d.never,0),
    total:   districts.reduce((s,d)=>s+d.total,0),
  }), [districts])

  const handleSort = (k: keyof DistrictRow) => {
    if (sortKey === k) setSortDir(p => p === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const TH: FC<{ label: string; k: keyof DistrictRow }> = ({ label, k }) => (
    <th onClick={() => handleSort(k)}
      className={`text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap select-none transition-colors ${
        isDark
            ? 'text-slate-500 hover:text-white'
            : 'text-black hover:text-black'
      }`}>
      {label}{sortKey === k && <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Comm ≤ 1 Day"      value={fmt(totals.d1)}   sub={`${((totals.d1/totals.total)*100).toFixed(1)}% of fleet`}   color="#10b981" icon="🟢" isDark={isDark} />
        <KPICard label="Comm ≤ 30 Days"    value={fmt(totals.d1+totals.d2_5+totals.d6_30)} sub="Healthy window"                     color="#3b82f6" icon="🔵" isDark={isDark} />
        <KPICard label="Silent > 30 Days"  value={fmtFull(totals.d31_90+totals.d91_180+totals.d180)} sub="Intervention needed"      color="#f97316" icon="🟠" isDark={isDark} />
        <KPICard label="Never Comm."       value={fmtFull(totals.never)} sub="Physical survey required"                              color="#ef4444" icon="🔴" isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Source Distribution — Manufacturer">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={SOURCE_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={56} outerRadius={84} paddingAngle={4}
                label={({ name, percent }: { name:string; percent:number }) =>
                  `${name.split('(')[0].trim()} ${(percent*100).toFixed(1)}%`}
                fontSize={9}>
                {SOURCE_DATA.map((s,i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {SOURCE_DATA.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-black'}`}>{s.name}: <span className={`font-mono ${isDark ? 'text-white' : 'text-black'}`}>{fmtFull(s.value)}</span></span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Active vs Tamper Detected Status">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={STATUS_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={56} outerRadius={84} paddingAngle={4}
                label={({ name, percent }: { name:string; percent:number }) =>
                  `${name.split('(')[0].trim()} ${(percent*100).toFixed(1)}%`}
                fontSize={9}>
                {STATUS_DATA.map((s,i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {STATUS_DATA.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-black'}`}>{s.name}: <span className={`font-mono ${isDark ? 'text-white' : 'text-black'}`}>{fmtFull(s.value)}</span></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Full sortable table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/3' : 'border-slate-300 bg-slate-50'}`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-white/8' : 'border-slate-300'}`}>
          <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>Full Ageing Table</p>
          <FilterSelect value={districtFilter} onChange={setDistrictFilter}
            options={districts.map(d => d.district)} label="All Districts" isDark={isDark} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/8' : 'border-slate-300'}`}>
                <TH label="District"   k="district" />
                <TH label="Total"      k="total" />
                <TH label="1 Day"      k="d1" />
                <TH label="2-5 Days"   k="d2_5" />
                <TH label="6-30 Days"  k="d6_30" />
                <TH label="31-90D"     k="d31_90" />
                <TH label="91-180D"    k="d91_180" />
                <TH label=">180D"      k="d180" />
                <TH label="Never"      k="never" />
                <TH label="Drift"      k="drift" />
                <TH label="Perf %"     k="pct" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className={`border-b transition-colors ${
                  isDark
                    ? 'border-white/4 hover:bg-white/4'
                    : 'border-slate-300 hover:bg-slate-200'
                }`}>
                  <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{row.district}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-300' : 'text-black'}`}>{fmtFull(row.total)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-emerald-400' : 'text-black'}`}>{fmtFull(row.d1)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-blue-400' : 'text-black'}`}>{fmtFull(row.d2_5)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-amber-400' : 'text-black'}`}>{fmtFull(row.d6_30)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-orange-400' : 'text-black'}`}>{fmtFull(row.d31_90)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-red-400' : 'text-black'}`}>{fmtFull(row.d91_180)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-purple-400' : 'text-black'}`}>{fmtFull(row.d180)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-500' : 'text-black'}`}>{fmtFull(row.never)}</td>
                  <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-slate-600' : 'text-black'}`}>{fmtFull(row.drift)}</td>
                  <td className="py-2.5 px-3"><Badge v={row.pct} isDark={isDark} /></td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className={`border-t ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
                <td className={`py-2.5 px-3 font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>TOTAL</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-white' : 'text-black'}`}>{fmtFull(totals.total)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-black'}`}>{fmtFull(totals.d1)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-blue-400' : 'text-black'}`}>{fmtFull(totals.d2_5)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-amber-400' : 'text-black'}`}>{fmtFull(totals.d6_30)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-orange-400' : 'text-black'}`}>{fmtFull(totals.d31_90)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-red-400' : 'text-black'}`}>{fmtFull(totals.d91_180)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-purple-400' : 'text-black'}`}>{fmtFull(totals.d180)}</td>
                <td className={`py-2.5 px-3 font-bold font-mono ${isDark ? 'text-slate-500' : 'text-black'}`}>{fmtFull(totals.never)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   UPDATES VIEW
═══════════════════════════════════════════════════ */

const UpdatesView: FC<{ updates: DailyUpdate[]; isDark?: boolean }> = ({ updates, isDark = true }) => {
  const [filter, setFilter] = useState('')
  const filtered = filter ? updates.filter(u => u.type === filter) : updates

  const typeStyle: Record<DailyUpdate['type'], string> = {
    improvement: 'border-emerald-500/25 bg-emerald-500/5',
    degradation: 'border-red-500/25 bg-red-500/5',
    neutral:     'border-slate-500/20 bg-slate-500/5',
  }
  const typeIcon: Record<DailyUpdate['type'], string> = {
    improvement: '▲', degradation: '▼', neutral: '◆',
  }
  const typeTextColor: Record<DailyUpdate['type'], string> = {
    improvement: 'text-emerald-400', degradation: 'text-red-400', neutral: 'text-slate-400',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>Network Update Log</p>
          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-black'}`}>Daily field events, maintenance notes &amp; performance changes</p>
        </div>
        <FilterSelect value={filter} onChange={setFilter}
          options={['improvement','degradation','neutral']} label="All Types" isDark={isDark} />
      </div>

      {filtered.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center text-sm ${isDark ? 'border-white/8 bg-white/3 text-slate-500' : 'border-slate-300 bg-slate-50 text-black'}`}>
          No updates found.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(u => (
          <div key={u.id} className={`rounded-2xl border p-4 ${typeStyle[u.type]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`text-base mt-0.5 ${isDark ? typeTextColor[u.type] : 'text-black'}`}>{typeIcon[u.type]}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>{u.district}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-black'}`}>·</span>
                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-black'}`}>{u.date}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                      isDark
                        ? u.type==='improvement' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : u.type==='degradation' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                        : 'bg-white text-black border-slate-400'
                    }`}>{u.type}</span>
                  </div>
                  <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-black'}`}>{u.note}</p>
                </div>
              </div>
              <div className={`flex-shrink-0 text-sm font-black font-mono px-3 py-1.5 rounded-xl border ${
                isDark
                  ? u.delta >= 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : 'bg-red-500/15 text-red-400 border-red-500/25'
                  : 'bg-white text-black border-slate-400'
              }`}>
                {u.delta >= 0 ? '+' : ''}{u.delta.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   CSV PARSING UTILITIES
═══════════════════════════════════════════════════ */

interface ParseResult { 
  rows: DistrictRow[]; 
  errors: string[] 
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  cells.push(current.trim())
  return cells
}

const toInt = (value: string): number => {
  const normalized = value.replace(/[^\d-]/g, '')
  return normalized ? parseInt(normalized, 10) : 0
}

const toFloat = (value: string): number => {
  const normalized = value.replace(/[^\d.-]/g, '')
  return normalized ? parseFloat(normalized) : 0
}

function parseMainReportCSV(text: string): ParseResult {
  const errors: string[] = []
  const rows: DistrictRow[] = []
  
  try {
    const normalizedText = text
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()

    const lines = normalizedText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least a header and one data row')
      return { rows, errors }
    }
    
    // Parse header
    const header = parseCSVLine(lines[0]).map(cell => cell.replace(/"/g, '').trim())
    const expectedHeaders = [
      'DISTRICT', '1 Day', '2-5 Days', '6-30 Days', '31-90 Days', 
      '91-180 Days', '>180 Days', 'Never', 'Meter Clock Drift', 
      'Total Meters', '%'
    ]
    
    const headerMatch = expectedHeaders.every(h => header.includes(h))
    if (!headerMatch) {
      errors.push('Invalid CSV format. Expected headers: ' + expectedHeaders.join(', '))
      return { rows, errors }
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(cell => cell.replace(/"/g, '').trim())
      
      if (values.length < 11) {
        errors.push(`Row ${i + 1}: Insufficient columns`)
        continue
      }
      
      try {
        const district: DistrictRow = {
          id: `D${String(i + 1).padStart(2, '0')}`,
          district: values[0],
          d1: toInt(values[1]),
          d2_5: toInt(values[2]),
          d6_30: toInt(values[3]),
          d31_90: toInt(values[4]),
          d91_180: toInt(values[5]),
          d180: toInt(values[6]),
          never: toInt(values[7]),
          drift: toInt(values[8]),
          total: toInt(values[9]),
          pct: toFloat(values[10]),
          lastUpdated: new Date().toISOString().slice(0, 10)
        }
        
        rows.push(district)
      } catch (err) {
        errors.push(`Row ${i + 1}: Failed to parse data`)
      }
    }
    
    if (rows.length === 0) {
      errors.push('No valid data rows found')
    }
    
  } catch (err) {
    errors.push('Failed to parse CSV file')
  }
  
  return { rows, errors }
}

/* ═══════════════════════════════════════════════════
   ADMIN PANEL
═══════════════════════════════════════════════════ */

const ADMIN_PASS = 'tpddl2025'

interface AdminPanelProps {
  onClose: () => void
}

const AdminPanel: FC<AdminPanelProps> = ({ onClose }) => {
  const { districts, meterTypes, updates, setDistricts, setMeterTypes, setUpdates } = useDashboard()
  const [pass, setPass] = useState('')
  const [auth, setAuth] = useState(false)
  const [section, setSection] = useState<'districts'|'metertypes'|'updates'>('districts')
  const [editRow, setEditRow] = useState<DistrictRow | null>(null)
  const [editMeter, setEditMeter] = useState<MeterTypeRow | null>(null)
  const [newUpdate, setNewUpdate] = useState<Partial<DailyUpdate>>({})
  const [msg, setMsg] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<{ rows: DistrictRow[]; filename: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const onUpdateDistricts = useCallback((rows: DistrictRow[]) => {
    setDistricts(rows)
  }, [setDistricts])

  const onUpdateMeterTypes = useCallback((rows: MeterTypeRow[]) => {
    setMeterTypes(rows)
  }, [setMeterTypes])

  const onUpdateLogs = useCallback((rows: DailyUpdate[]) => {
    setUpdates(rows)
  }, [setUpdates])

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      flash('❌ Please select a CSV file')
      return
    }
    setCsvFile(file)
    processCSVFile(file)
  }

  const processCSVFile = (file: File) => {
    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseMainReportCSV(text)
      
      if (result.errors.length > 0) {
        flash('❌ ' + result.errors[0])
      } else {
        onUpdateDistricts(result.rows)
        setCsvPreview(null)
        setCsvFile(null)
        flash(`✅ Imported ${result.rows.length} districts from ${file.name}. Main dashboard is updated.`)
      }
      setIsProcessing(false)
    }
    
    reader.onerror = () => {
      flash('❌ Failed to read file')
      setIsProcessing(false)
    }
    
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const confirmCSVImport = () => {
    if (csvPreview) {
      onUpdateDistricts(csvPreview.rows)
      flash(`✅ Imported ${csvPreview.rows.length} districts from CSV`)
      setCsvPreview(null)
      setCsvFile(null)
    }
  }

  if (!auth) return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-3">🔐</div>
          <h2 className="text-lg font-black text-white">Admin Access</h2>
          <p className="text-xs text-slate-500 mt-1">Tata Power DDL · Smart Meter Dashboard</p>
        </div>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (pass === ADMIN_PASS ? setAuth(true) : flash('Wrong password'))}
          placeholder="Enter admin password"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 mb-3" />
        {msg && <p className="text-xs text-red-400 mb-3 text-center">{msg}</p>}
        <div className="flex gap-2">
          <button onClick={() => pass === ADMIN_PASS ? setAuth(true) : flash('Wrong password')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
            Login
          </button>
          <button onClick={onClose}
            className="flex-1 bg-white/5 border border-white/8 text-slate-400 text-sm font-bold py-2.5 rounded-xl transition-colors">
            Cancel
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-4">Hint: tpddl2025</p>
      </div>
    </div>
  )

  const IF: FC<{ label:string; value:string|number; onChange:(v:string)=>void; type?:string }> =
    ({ label, value, onChange, type='text' }) => (
    <div>
      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40 font-mono" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-start justify-center">
      <div className="rounded-2xl border border-white/10 bg-[#0b0f14] w-full max-w-4xl my-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">⚙️</div>
            <div>
              <h2 className="text-sm font-black text-white">Admin Control Panel</h2>
              <p className="text-[10px] text-slate-500">Add, edit, delete dashboard data</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-500 hover:text-white text-xs bg-white/5 border border-white/8 px-3 py-1.5 rounded-lg transition-all">
            ✕ Close
          </button>
        </div>

        {msg && (
          <div className="mx-5 mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-400 font-medium">
            {msg}
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-2 p-4 border-b border-white/8">
          {(['districts','metertypes','updates'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                section === s ? 'bg-blue-600 text-white' : 'bg-white/4 text-slate-400 border border-white/8 hover:text-white'
              }`}>
              {s==='districts' ? '🏙️ Districts' : s==='metertypes' ? '⚡ Meter Types' : '📋 Daily Updates'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Districts */}
          {section==='districts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-300">{districts.length} districts</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditRow({ id:'new', district:'', d1:0, d2_5:0, d6_30:0, d31_90:0, d91_180:0, d180:0, never:0, drift:0, total:0, pct:0, lastUpdated: new Date().toISOString().slice(0,10) })}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                    + Add District
                  </button>
                  <label className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer">
                    📁 Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* CSV Upload Area */}
              {!csvPreview && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-white/20 bg-white/2 hover:border-white/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
                    📊
                  </div>
                  <p className="text-sm font-semibold text-white mb-2">
                    {isDragging ? 'Drop CSV file here' : 'Upload Daily Report'}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    Drag & drop a CSV file or click the button above
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Expected format: Main Report with district communication data
                  </p>
                  {isProcessing && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-blue-400">Processing CSV...</span>
                    </div>
                  )}
                </div>
              )}

              {/* CSV Preview Modal */}
              {csvPreview && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">CSV Preview</h3>
                      <p className="text-xs text-slate-400">
                        File: {csvPreview.filename} • {csvPreview.rows.length} districts
                      </p>
                    </div>
                    <button
                      onClick={() => setCsvPreview(null)}
                      className="text-slate-400 hover:text-white text-xs bg-white/5 border border-white/8 px-2 py-1 rounded-lg transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-2 text-slate-400 font-semibold">District</th>
                          <th className="text-right py-2 px-2 text-slate-400 font-semibold">1 Day</th>
                          <th className="text-right py-2 px-2 text-slate-400 font-semibold">2-5 Days</th>
                          <th className="text-right py-2 px-2 text-slate-400 font-semibold">6-30 Days</th>
                          <th className="text-right py-2 px-2 text-slate-400 font-semibold">Total</th>
                          <th className="text-right py-2 px-2 text-slate-400 font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 px-2 text-white font-medium">{row.district}</td>
                            <td className="py-2 px-2 text-right text-slate-300">{row.d1.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-slate-300">{row.d2_5.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-slate-300">{row.d6_30.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-slate-300">{row.total.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-slate-300">{row.pct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.rows.length > 10 && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        ... and {csvPreview.rows.length - 10} more rows
                      </p>
                    )}
                  </div>

                  {/* Import Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={confirmCSVImport}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      ✅ Import All {csvPreview.rows.length} Districts
                    </button>
                    <button
                      onClick={() => setCsvPreview(null)}
                      className="flex-1 bg-white/5 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-white/8 transition-colors hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {editRow && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">{editRow.id === 'new' ? 'New District' : `Edit: ${editRow.district}`}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <IF label="District Name" value={editRow.district}  onChange={v => setEditRow({...editRow, district:v})} />
                    <IF label="1 Day"         value={editRow.d1}        onChange={v => setEditRow({...editRow, d1:+v})}       type="number" />
                    <IF label="2-5 Days"      value={editRow.d2_5}      onChange={v => setEditRow({...editRow, d2_5:+v})}     type="number" />
                    <IF label="6-30 Days"     value={editRow.d6_30}     onChange={v => setEditRow({...editRow, d6_30:+v})}    type="number" />
                    <IF label="31-90 Days"    value={editRow.d31_90}    onChange={v => setEditRow({...editRow, d31_90:+v})}   type="number" />
                    <IF label="91-180 Days"   value={editRow.d91_180}   onChange={v => setEditRow({...editRow, d91_180:+v})}  type="number" />
                    <IF label=">180 Days"     value={editRow.d180}      onChange={v => setEditRow({...editRow, d180:+v})}     type="number" />
                    <IF label="Never"         value={editRow.never}     onChange={v => setEditRow({...editRow, never:+v})}    type="number" />
                    <IF label="Clock Drift"   value={editRow.drift}     onChange={v => setEditRow({...editRow, drift:+v})}    type="number" />
                    <IF label="Total Meters"  value={editRow.total}     onChange={v => setEditRow({...editRow, total:+v})}    type="number" />
                    <IF label="Performance %" value={editRow.pct}       onChange={v => setEditRow({...editRow, pct:+v})}      type="number" />
                    <IF label="Last Updated"  value={editRow.lastUpdated} onChange={v => setEditRow({...editRow, lastUpdated:v})} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const rows = editRow.id==='new'
                        ? [...districts, {...editRow, id:`D${uid()}`}]
                        : districts.map(d => d.id===editRow.id ? editRow : d)
                      onUpdateDistricts(rows); setEditRow(null); flash('✅ District saved')
                    }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">Save</button>
                    <button onClick={() => setEditRow(null)}
                      className="bg-white/5 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-white/8 transition-colors hover:bg-white/10">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {districts.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge v={d.pct} />
                      <span className="text-sm font-semibold text-white">{d.district}</span>
                      <span className="text-xs text-slate-500 font-mono">{fmtFull(d.total)} meters</span>
                      <span className="text-[10px] text-slate-600">{d.lastUpdated}</span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setEditRow({...d})}
                        className="text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-all">Edit</button>
                      <button onClick={() => { onUpdateDistricts(districts.filter(x => x.id!==d.id)); flash('🗑️ District removed') }}
                        className="text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meter Types */}
          {section==='metertypes' && (
            <div className="space-y-4">
              {editMeter && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Edit: {editMeter.type}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <IF label="1 Day"         value={editMeter.d1}    onChange={v => setEditMeter({...editMeter, d1:+v})}    type="number" />
                    <IF label="2-5 Days"      value={editMeter.d2_5}  onChange={v => setEditMeter({...editMeter, d2_5:+v})}  type="number" />
                    <IF label="6-30 Days"     value={editMeter.d6_30} onChange={v => setEditMeter({...editMeter, d6_30:+v})} type="number" />
                    <IF label=">30 Days"      value={editMeter.gt30}  onChange={v => setEditMeter({...editMeter, gt30:+v})}  type="number" />
                    <IF label="Never"         value={editMeter.never} onChange={v => setEditMeter({...editMeter, never:+v})} type="number" />
                    <IF label="Total"         value={editMeter.total} onChange={v => setEditMeter({...editMeter, total:+v})} type="number" />
                    <IF label="Performance %" value={editMeter.pct}   onChange={v => setEditMeter({...editMeter, pct:+v})}   type="number" />
                    <IF label="Color (hex)"   value={editMeter.color} onChange={v => setEditMeter({...editMeter, color:v})} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      onUpdateMeterTypes(meterTypes.map(m => m.id===editMeter.id ? editMeter : m))
                      setEditMeter(null); flash('✅ Meter type saved')
                    }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">Save</button>
                    <button onClick={() => setEditMeter(null)}
                      className="bg-white/5 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-white/8 hover:bg-white/10 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {meterTypes.map(m => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="text-sm font-semibold text-white">{m.type}</span>
                      <span className="text-xs text-slate-500 font-mono">{fmtFull(m.total)} meters</span>
                      <Badge v={m.pct} />
                    </div>
                    <button onClick={() => setEditMeter({...m})}
                      className="text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-all">Edit</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updates */}
          {section==='updates' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
                <p className="text-xs font-bold text-white">Log New Update</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Date</label>
                    <input type="date" value={newUpdate.date ?? ''}
                      onChange={e => setNewUpdate({...newUpdate, date:e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">District</label>
                    <select value={newUpdate.district ?? ''} onChange={e => setNewUpdate({...newUpdate, district:e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40 cursor-pointer">
                      <option value="" style={{ background:'#0f172a' }}>Select district</option>
                      {districts.map(d => <option key={d.id} value={d.district} style={{ background:'#0f172a' }}>{d.district}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Type</label>
                    <select value={newUpdate.type ?? ''} onChange={e => setNewUpdate({...newUpdate, type:e.target.value as DailyUpdate['type']})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40 cursor-pointer">
                      <option value="" style={{ background:'#0f172a' }}>Select type</option>
                      <option value="improvement" style={{ background:'#0f172a' }}>Improvement</option>
                      <option value="degradation" style={{ background:'#0f172a' }}>Degradation</option>
                      <option value="neutral"     style={{ background:'#0f172a' }}>Neutral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Delta % change</label>
                    <input type="number" step="0.01" value={newUpdate.delta ?? ''}
                      onChange={e => setNewUpdate({...newUpdate, delta:+e.target.value})}
                      placeholder="+0.5 or -1.2"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Note / Description</label>
                    <input type="text" value={newUpdate.note ?? ''}
                      onChange={e => setNewUpdate({...newUpdate, note:e.target.value})}
                      placeholder="Describe what changed..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40" />
                  </div>
                </div>
                <button onClick={() => {
                  if (!newUpdate.district || !newUpdate.note || !newUpdate.date) { flash('Fill all fields'); return }
                  const u: DailyUpdate = {
                    id: `U${uid()}`, date: newUpdate.date!, district: newUpdate.district!,
                    note: newUpdate.note!, delta: newUpdate.delta ?? 0, type: newUpdate.type ?? 'neutral',
                  }
                  onUpdateLogs([u, ...updates]); setNewUpdate({}); flash('✅ Update logged')
                }} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors">
                  + Log Update
                </button>
              </div>

              <div className="space-y-2">
                {updates.map(u => (
                  <div key={u.id} className="flex items-start justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{u.district}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{u.date}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          u.type==='improvement'?'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          :u.type==='degradation'?'bg-red-500/15 text-red-400 border-red-500/25'
                          :'bg-slate-500/15 text-slate-400 border-slate-500/25'
                        }`}>{u.type}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{u.note}</p>
                    </div>
                    <button onClick={() => { onUpdateLogs(updates.filter(x => x.id!==u.id)); flash('🗑️ Removed') }}
                      className="flex-shrink-0 text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded-lg transition-all">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════ */

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id:'overview',  label:'Overview',    icon:'🌐' },
  { id:'district',  label:'Districts',   icon:'🏙️' },
  { id:'metertype', label:'Meter Types', icon:'⚡' },
  { id:'ageing',    label:'Ageing',      icon:'📅' },
  { id:'updates',   label:'Updates',     icon:'📋' },
]

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/signin" replace />
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardApp /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function DashboardApp(): JSX.Element {
  const { districts, meterTypes, updates, setDistricts, setMeterTypes, setUpdates, lastUpdated } = useDashboard()
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState<TabId>('overview')
  const [selectedDistrict, setSelected] = useState<string>('PITAMPURA')
  const [time, setTime] = useState<Date>(new Date())
  const [showAdmin, setShowAdmin] = useState<boolean>(false)

  useEffect(() => {
    const tid = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tid)
  }, [])

  const totalMeters = districts.reduce((s,d) => s + d.total, 0)
  const totalD1     = districts.reduce((s,d) => s + d.d1, 0)
  const avgPct      = districts.length
    ? (districts.reduce((s,d) => s + d.pct, 0) / districts.length).toFixed(1)
    : '—'

  // Format last updated time
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  // Theme color helpers
  const isDark = theme === 'dark'
  const themeColors = {
    bg: isDark ? 'bg-transparent' : 'bg-transparent',
    text: isDark ? 'text-slate-100' : 'text-slate-900',
    border: isDark ? 'border-slate-700/70' : 'border-slate-200',
    headerBg: isDark ? 'bg-slate-950/55' : 'bg-white/75',
    cardBorder: isDark ? 'border-white/8' : 'border-slate-200',
    cardBg: isDark ? 'bg-white/3' : 'bg-slate-100/50',
    tableBorder: isDark ? 'border-white/8' : 'border-slate-200',
    tableText: isDark ? 'text-white' : 'text-slate-900',
    secondaryText: isDark ? 'text-slate-300' : 'text-slate-700',
    mutedText: isDark ? 'text-slate-500' : 'text-slate-600',
  }

  return (
    <div className={`dashboard-shell min-h-screen ${themeColors.bg} ${themeColors.text}`}>
      <div className="dashboard-layer">
      {/* ── Header ── */}
      <div className={`border-b panel-glass ${themeColors.border} ${themeColors.headerBg} sticky top-0 z-50`}>
        <div className="max-w-screen-xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-24 rounded-xl overflow-hidden border panel-glass ${isDark ? 'border-slate-700 bg-white/95' : 'border-slate-300 bg-white'}`}>
              <img src={tataPowerLogo} alt="Tata Power DDL" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <h1 className={`brand-title text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Smart Meter Communication Dashboard</h1>
              <p className={`text-xs font-semibold tracking-wide ${isDark ? 'text-slate-400' : 'text-black'}`}>Tata Power DDL · Live Monitoring · Last sync {formatTimeAgo(lastUpdated)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden sm:block text-right ${theme === 'dark' ? 'text-slate-300' : 'text-black'}`}>
              <p className="text-xs font-bold">{user?.name ?? 'User'}</p>
              <p className="text-[10px] opacity-80 font-semibold">{user?.employeeId ?? 'Employee'}</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors border ${
                isDark
                  ? 'text-slate-300 border-slate-600 hover:text-white hover:bg-slate-800/60' 
                  : 'text-black border-slate-300 hover:text-black hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`p-2 rounded-xl transition-colors border ${
              isDark
                ? 'text-slate-300 border-slate-600 hover:text-white hover:bg-slate-800/60' 
                : 'text-black border-slate-300 hover:text-black hover:bg-slate-200'
              }`}>
              <RotateCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAdmin(!showAdmin)} className={`p-2 rounded-xl transition-colors border ${
              isDark
                ? 'text-slate-300 border-slate-600 hover:text-white hover:bg-slate-800/60' 
                : 'text-black border-slate-300 hover:text-black hover:bg-slate-200'
              }`}>
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={signOut}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                isDark
                  ? 'text-slate-200 border-slate-600 hover:bg-slate-800/70 hover:text-white'
                  : 'text-black border-slate-300 hover:bg-slate-200 hover:text-black'
              }`}
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-5 pb-4">
          <div className={`flex gap-2 overflow-x-auto scrollbar-hide rounded-2xl p-2 ${isDark ? 'bg-slate-900/65 border border-slate-700/60' : 'bg-white/75 border border-slate-200'}`}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  tab === t.id
                    ? isDark
                      ? 'bg-gradient-to-r from-sky-500/30 to-amber-500/25 text-white border border-sky-500/40'
                      : 'bg-gradient-to-r from-sky-100 to-amber-100 text-black border border-sky-300'
                    : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      : 'text-black hover:text-black hover:bg-slate-100'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-screen-xl mx-auto px-5 py-7 animate-rise">
        {tab === 'overview'  && <OverviewView  districts={districts} meterTypes={meterTypes} isDark={isDark} />}
        {tab === 'district'  && <DistrictView  districts={districts} selected={selectedDistrict} setSelected={setSelected} isDark={isDark} />}
        {tab === 'metertype' && <MeterTypeView meterTypes={meterTypes} isDark={isDark} />}
        {tab === 'ageing'    && <AgeingView    districts={districts} isDark={isDark} />}
        {tab === 'updates'   && <UpdatesView   updates={updates} isDark={isDark} />}
      </main>

      {/* ── Footer ── */}
      <footer className={`border-t mt-8 ${themeColors.border} ${isDark ? 'bg-slate-950/30' : 'bg-white/40'} panel-glass`}>
        <div className="max-w-screen-xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`brand-title text-sm font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>Smart Meter Communication Dashboard · Tata Power DDL</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-black'}`}>
              Data: Meters Communication Last Status Detail Report · Dec 26, 2025 · 6,46,302 meters
            </p>
          </div>
          <div className="text-right">
            <p className={`brand-title text-sm font-bold ${isDark ? 'text-slate-300' : 'text-black'}`}>Aman Yadav</p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-black'}`}>Data & Frontend Dev Intern · Tata Power DDL · Dec 2025 – Jan 2026</p>
          </div>
        </div>
      </footer>

      {/* ── Admin Modal ── */}
      {showAdmin && (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
        />
      )}
      </div>
    </div>
  )
}
