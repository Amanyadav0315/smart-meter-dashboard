import { useState, useEffect, useMemo, useCallback, FC, ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Zap, RotateCw, Settings, Sun, Moon } from 'lucide-react'
import { useDashboard, type DistrictRow, type MeterTypeRow, type DailyUpdate } from './context/DashboardContext'
import { useTheme } from './context/ThemeContext'
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
}
const KPICard: FC<KPIProps> = ({ label, value, sub, color = '#3b82f6', icon, trend }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 p-6 backdrop-blur-sm group hover:border-slate-600/50 transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{label}</p>
        <p className="text-2xl font-semibold text-white leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
          {value}
        </p>
        {sub && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{sub}</p>}
        {trend !== undefined && (
          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}% vs prev
          </div>
        )}
      </div>
      <div className="text-xl opacity-40 ml-3 mt-0.5">{icon}</div>
    </div>
  </div>
)

const ChartTip: FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl p-3 text-xs shadow-2xl min-w-[140px]">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (p.fill ?? p.color) as string }} />
          <span className="text-slate-400 flex-1 truncate">{p.name}:</span>
          <span className="text-white font-mono ml-1">{fmtFull(p.value as number)}</span>
        </div>
      ))}
    </div>
  )
}

const Badge: FC<{ v: number }> = ({ v }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${perfBg(v)}`}>
    {v}%
  </span>
)

const ChartCard: FC<{ title: string; children: ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`rounded-2xl border border-white/8 bg-gradient-to-br from-white/4 to-transparent p-5 ${className}`}>
    <h3 className="text-[10px] font-bold text-slate-500 tracking-[0.12em] uppercase mb-4">{title}</h3>
    {children}
  </div>
)

const FilterSelect: FC<{ value: string; onChange: (v: string) => void; options: string[]; label: string }> = ({ value, onChange, options, label }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
  >
    <option value="">{label}</option>
    {options.map(o => <option key={o} value={o} style={{ background: '#0f172a' }}>{o}</option>)}
  </select>
)

/* ═══════════════════════════════════════════════════
   OVERVIEW VIEW
═══════════════════════════════════════════════════ */

const OverviewView: FC<{ districts: DistrictRow[]; meterTypes: MeterTypeRow[] }> = ({ districts, meterTypes }) => {
  const totalMeters = districts.reduce((s, d) => s + d.total, 0)
  const totalD1     = districts.reduce((s, d) => s + d.d1, 0)
  const totalNever  = districts.reduce((s, d) => s + d.never, 0)
  const avgPct      = districts.length
    ? (districts.reduce((s, d) => s + d.pct, 0) / districts.length).toFixed(2)
    : '0'

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
        <KPICard label="Total Smart Meters"  value={fmt(totalMeters)}  sub={`${districts.length} districts monitored`}               color="#3b82f6" icon="⚡" />
        <KPICard label="Communicated Today"  value={fmt(totalD1)}      sub={`${((totalD1/totalMeters)*100).toFixed(1)}% of total`}    color="#10b981" icon="✅" trend={0.41} />
        <KPICard label="Silent / Never"      value={fmtFull(totalNever)} sub="Require field inspection"                              color="#ef4444" icon="🔇" trend={-0.03} />
        <KPICard label="Network Performance" value={`${avgPct}%`}      sub="Avg across all districts"                                color="#8b5cf6" icon="📡" />
      </div>

      {/* Comm Tech Pills */}
      <div className="grid grid-cols-3 gap-3">
        {COMM_TECH.map(t => (
          <div key={t.tech} className="rounded-2xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">{t.tech}</p>
              <p className="text-sm font-black text-white" style={{ fontFamily: "'Space Mono',monospace" }}>{fmt(t.meters)}</p>
              <p className="text-[10px] text-slate-500">{t.pct}% of fleet</p>
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
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize:10, color:'#64748b', paddingTop:8 }} />
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
}

const DistrictView: FC<DistrictViewProps> = ({ districts, selected, setSelected }) => {
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
      className="text-left py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap select-none transition-colors">
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
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8 hover:text-white'
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
            <h2 className="text-xl font-black text-white">{d.district}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Last updated: {d.lastUpdated}</p>
          </div>
          <Badge v={d.pct} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPICard label="Total Meters" value={fmtFull(d.total)}   sub="Installed"                                                    color="#3b82f6" icon="📟" />
          <KPICard label="Active 1-Day" value={fmtFull(d.d1)}      sub={`${((d.d1/d.total)*100).toFixed(1)}% communicating`}          color="#10b981" icon="✅" />
          <KPICard label="Never Comm."  value={fmtFull(d.never)}   sub={`${((d.never/d.total)*100).toFixed(1)}% — needs inspection`}  color="#ef4444" icon="🔇" />
          <KPICard label="Clock Drift"  value={fmtFull(d.drift)}   sub="Time sync issues"                                             color="#6b7280" icon="⏰" />
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
                <XAxis dataKey="bucket" tick={{ fill:'#475569', fontSize:8 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill:'#475569', fontSize:9 }} tickFormatter={fmt} />
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
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="p-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-300">All Districts Comparison <span className="text-slate-600 font-normal">(click headers to sort)</span></p>
          <FilterSelect value={filterPct} onChange={setFilterPct}
            options={['high','medium','low']} label="Filter by performance" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
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
                  className={`border-b border-white/4 cursor-pointer transition-colors ${
                    selected === row.district ? 'bg-blue-500/10' : 'hover:bg-white/4'
                  }`}>
                  <td className="py-2.5 px-3 text-white font-semibold">{row.district}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{fmtFull(row.total)}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">{fmtFull(row.d1)}</td>
                  <td className="py-2.5 px-3 text-blue-400 font-mono">{fmtFull(row.d2_5)}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono">{fmtFull(row.d6_30)}</td>
                  <td className="py-2.5 px-3 text-orange-400 font-mono">{fmtFull(row.d31_90)}</td>
                  <td className="py-2.5 px-3 text-purple-400 font-mono">{fmtFull(row.d180)}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{fmtFull(row.never)}</td>
                  <td className="py-2.5 px-3"><Badge v={row.pct} /></td>
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

const MeterTypeView: FC<{ meterTypes: MeterTypeRow[] }> = ({ meterTypes }) => {
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
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{m.type}</p>
            <p className="text-xl font-black text-white" style={{ fontFamily:"'Space Mono',monospace" }}>{fmt(m.total)}</p>
            <div className="mt-2"><Badge v={m.pct} /></div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="rounded-2xl border p-5" style={{ borderColor:`${sel.color}30`, background:`${sel.color}08` }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-white">{sel.type} — Detail</h3>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-xs transition-colors">✕ close</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Total"       value={fmtFull(sel.total)}  color={sel.color}         icon="📊" />
            <KPICard label="1-Day Active" value={fmtFull(sel.d1)}    color="#10b981"           icon="✅" />
            <KPICard label="Never Comm." value={fmtFull(sel.never)}  color="#ef4444"           icon="🔇" />
            <KPICard label="Performance" value={`${sel.pct}%`}       color={perfColor(sel.pct)} icon="📈" />
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
              <XAxis dataKey="type" tick={{ fill:'#475569', fontSize:9 }} angle={-28} textAnchor="end" interval={0} />
              <YAxis domain={[60,100]} tick={{ fill:'#475569', fontSize:9 }} tickFormatter={(v:number) => `${v}%`} />
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
            <XAxis dataKey="type" tick={{ fill:'#475569', fontSize:9 }} angle={-28} textAnchor="end" interval={0} />
            <YAxis tick={{ fill:'#475569', fontSize:9 }} tickFormatter={fmt} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize:9, color:'#64748b', paddingTop:4 }} />
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

const AgeingView: FC<{ districts: DistrictRow[] }> = ({ districts }) => {
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
      className="text-left py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap select-none transition-colors">
      {label}{sortKey === k && <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Comm ≤ 1 Day"      value={fmt(totals.d1)}   sub={`${((totals.d1/totals.total)*100).toFixed(1)}% of fleet`}   color="#10b981" icon="🟢" />
        <KPICard label="Comm ≤ 30 Days"    value={fmt(totals.d1+totals.d2_5+totals.d6_30)} sub="Healthy window"                     color="#3b82f6" icon="🔵" />
        <KPICard label="Silent > 30 Days"  value={fmtFull(totals.d31_90+totals.d91_180+totals.d180)} sub="Intervention needed"      color="#f97316" icon="🟠" />
        <KPICard label="Never Comm."       value={fmtFull(totals.never)} sub="Physical survey required"                              color="#ef4444" icon="🔴" />
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
                <span className="text-[11px] text-slate-400">{s.name}: <span className="text-white font-mono">{fmtFull(s.value)}</span></span>
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
                <span className="text-[11px] text-slate-400">{s.name}: <span className="text-white font-mono">{fmtFull(s.value)}</span></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Full sortable table */}
      <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="p-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-300">Full Ageing Table</p>
          <FilterSelect value={districtFilter} onChange={setDistrictFilter}
            options={districts.map(d => d.district)} label="All Districts" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
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
                <tr key={row.id} className="border-b border-white/4 hover:bg-white/4 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">{row.district}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{fmtFull(row.total)}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">{fmtFull(row.d1)}</td>
                  <td className="py-2.5 px-3 text-blue-400 font-mono">{fmtFull(row.d2_5)}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono">{fmtFull(row.d6_30)}</td>
                  <td className="py-2.5 px-3 text-orange-400 font-mono">{fmtFull(row.d31_90)}</td>
                  <td className="py-2.5 px-3 text-red-400 font-mono">{fmtFull(row.d91_180)}</td>
                  <td className="py-2.5 px-3 text-purple-400 font-mono">{fmtFull(row.d180)}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{fmtFull(row.never)}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">{fmtFull(row.drift)}</td>
                  <td className="py-2.5 px-3"><Badge v={row.pct} /></td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-white/5 border-t border-white/10">
                <td className="py-2.5 px-3 text-slate-300 font-bold">TOTAL</td>
                <td className="py-2.5 px-3 text-white font-bold font-mono">{fmtFull(totals.total)}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold font-mono">{fmtFull(totals.d1)}</td>
                <td className="py-2.5 px-3 text-blue-400 font-bold font-mono">{fmtFull(totals.d2_5)}</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold font-mono">{fmtFull(totals.d6_30)}</td>
                <td className="py-2.5 px-3 text-orange-400 font-bold font-mono">{fmtFull(totals.d31_90)}</td>
                <td className="py-2.5 px-3 text-red-400 font-bold font-mono">{fmtFull(totals.d91_180)}</td>
                <td className="py-2.5 px-3 text-purple-400 font-bold font-mono">{fmtFull(totals.d180)}</td>
                <td className="py-2.5 px-3 text-slate-500 font-bold font-mono">{fmtFull(totals.never)}</td>
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

const UpdatesView: FC<{ updates: DailyUpdate[] }> = ({ updates }) => {
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
          <p className="text-sm font-bold text-white">Network Update Log</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Daily field events, maintenance notes &amp; performance changes</p>
        </div>
        <FilterSelect value={filter} onChange={setFilter}
          options={['improvement','degradation','neutral']} label="All Types" />
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-12 text-center text-slate-500 text-sm">
          No updates found.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(u => (
          <div key={u.id} className={`rounded-2xl border p-4 ${typeStyle[u.type]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`text-base mt-0.5 ${typeTextColor[u.type]}`}>{typeIcon[u.type]}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-white">{u.district}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500 font-mono">{u.date}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                      u.type==='improvement' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      : u.type==='degradation' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    }`}>{u.type}</span>
                  </div>
                  <p className="text-[12px] text-slate-300 leading-relaxed">{u.note}</p>
                </div>
              </div>
              <div className={`flex-shrink-0 text-sm font-black font-mono px-3 py-1.5 rounded-xl border ${
                u.delta >= 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                : 'bg-red-500/15 text-red-400 border-red-500/25'
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

function parseMainReportCSV(text: string): ParseResult {
  const errors: string[] = []
  const rows: DistrictRow[] = []
  
  try {
    const lines = text.trim().split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least a header and one data row')
      return { rows, errors }
    }
    
    // Parse header
    const header = lines[0].split(',').map(cell => cell.replace(/"/g, '').trim())
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
      const values = lines[i].split(',').map(cell => cell.replace(/"/g, '').trim())
      
      if (values.length < 11) {
        errors.push(`Row ${i + 1}: Insufficient columns`)
        continue
      }
      
      try {
        const district: DistrictRow = {
          id: `D${String(i + 1).padStart(2, '0')}`,
          district: values[0],
          d1: parseInt(values[1].replace(/,/g, '')) || 0,
          d2_5: parseInt(values[2].replace(/,/g, '')) || 0,
          d6_30: parseInt(values[3].replace(/,/g, '')) || 0,
          d31_90: parseInt(values[4].replace(/,/g, '')) || 0,
          d91_180: parseInt(values[5].replace(/,/g, '')) || 0,
          d180: parseInt(values[6].replace(/,/g, '')) || 0,
          never: parseInt(values[7].replace(/,/g, '')) || 0,
          drift: parseInt(values[8].replace(/,/g, '')) || 0,
          total: parseInt(values[9].replace(/,/g, '')) || 0,
          pct: parseFloat(values[10].replace('%', '')) || 0,
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

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
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
        setCsvPreview({ rows: result.rows, filename: file.name })
        flash(`📊 Preview ready: ${result.rows.length} districts`)
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

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/dashboard" element={<DashboardApp />} />
      <Route path="/" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}

function DashboardApp(): JSX.Element {
  const { districts, meterTypes, updates, setDistricts, setMeterTypes, setUpdates, lastUpdated } = useDashboard()
  const { theme, toggleTheme } = useTheme()
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

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* ── Header ── */}
      <div className={`border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white/80'} backdrop-blur-sm sticky top-0 z-50`}>
        <div className="max-w-screen-xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>Smart Meter Communication Dashboard</h1>
              <p className={`text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Tata Power DDL · Live Monitoring System · Last updated: {formatTimeAgo(lastUpdated)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}>
              <RotateCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAdmin(!showAdmin)} className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  tab === t.id
                    ? theme === 'dark' 
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-200 text-slate-900 border border-slate-300'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-screen-xl mx-auto px-5 py-6">
        {tab === 'overview'  && <OverviewView  districts={districts} meterTypes={meterTypes} />}
        {tab === 'district'  && <DistrictView  districts={districts} selected={selectedDistrict} setSelected={setSelected} />}
        {tab === 'metertype' && <MeterTypeView meterTypes={meterTypes} />}
        {tab === 'ageing'    && <AgeingView    districts={districts} />}
        {tab === 'updates'   && <UpdatesView   updates={updates} />}
      </main>

      {/* ── Footer ── */}
      <footer className={`border-t mt-8 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="max-w-screen-xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: "'Inter', sans-serif" }}>Smart Meter Communication Dashboard · Tata Power DDL</p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>
              Data: Meters Communication Last Status Detail Report · Dec 26, 2025 · 6,46,302 meters
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: "'Inter', sans-serif" }}>Aman Yadav</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>Data & Frontend Dev Intern · Tata Power DDL · Dec 2025 – Jan 2026</p>
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
  )
}
