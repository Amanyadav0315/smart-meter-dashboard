import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface DistrictRow {
  id: string
  district: string
  d1: number
  d2_5: number
  d6_30: number
  d31_90: number
  d91_180: number
  d180: number
  never: number
  drift: number
  total: number
  pct: number
  lastUpdated: string
}

export interface MeterTypeRow {
  id: string
  type: string
  d1: number
  d2_5: number
  d6_30: number
  gt30: number
  never: number
  drift: number
  total: number
  pct: number
  color: string
}

export interface DailyUpdate {
  id: string
  date: string
  district: string
  note: string
  delta: number
  type: 'improvement' | 'degradation' | 'neutral'
}

interface DashboardContextType {
  districts: DistrictRow[]
  meterTypes: MeterTypeRow[]
  updates: DailyUpdate[]
  setDistricts: (rows: DistrictRow[]) => void
  setMeterTypes: (rows: MeterTypeRow[]) => void
  setUpdates: (rows: DailyUpdate[]) => void
  lastUpdated: Date
}

const DashboardContext = createContext<DashboardContextType | null>(null)

// Local storage helpers
const loadLocal = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

const saveLocal = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Silent fail for localStorage issues
  }
}

// Seed data
const SEED_DISTRICTS: DistrictRow[] = [
  { id:'D01', district:'BADLI',         d1:31806, d2_5:3996,  d6_30:1033, d31_90:327,  d91_180:178, d180:596,  never:1030, drift:1, total:38967,  pct:81.62, lastUpdated:'2025-12-26' },
  { id:'D02', district:'BAWANA',        d1:32838, d2_5:2923,  d6_30:1784, d31_90:179,  d91_180:156, d180:567,  never:520,  drift:0, total:38967,  pct:84.27, lastUpdated:'2025-12-26' },
  { id:'D03', district:'CIVIL LINES',   d1:57046, d2_5:2132,  d6_30:941,  d31_90:246,  d91_180:222, d180:734,  never:1424, drift:5, total:62750,  pct:90.91, lastUpdated:'2025-12-26' },
  { id:'D04', district:'KESHAVPURAM',   d1:29798, d2_5:3374,  d6_30:2705, d31_90:458,  d91_180:245, d180:648,  never:794,  drift:1, total:38023,  pct:78.37, lastUpdated:'2025-12-26' },
  { id:'D05', district:'KIRARI',        d1:37308, d2_5:4582,  d6_30:744,  d31_90:107,  d91_180:137, d180:672,  never:295,  drift:2, total:43847,  pct:85.09, lastUpdated:'2025-12-26' },
  { id:'D06', district:'MANGOL PURI',   d1:37509, d2_5:4299,  d6_30:2533, d31_90:723,  d91_180:268, d180:914,  never:644,  drift:0, total:46890,  pct:79.99, lastUpdated:'2025-12-26' },
  { id:'D07', district:'MODEL TOWN',    d1:34882, d2_5:2299,  d6_30:755,  d31_90:248,  d91_180:101, d180:551,  never:371,  drift:1, total:39208,  pct:88.97, lastUpdated:'2025-12-26' },
  { id:'D08', district:'MOTI NAGAR',    d1:33678, d2_5:2943,  d6_30:1820, d31_90:527,  d91_180:172, d180:652,  never:673,  drift:1, total:40466,  pct:83.23, lastUpdated:'2025-12-26' },
  { id:'D09', district:'NARELA',        d1:39766, d2_5:5700,  d6_30:1036, d31_90:387,  d91_180:353, d180:810,  never:1829, drift:1, total:49882,  pct:79.72, lastUpdated:'2025-12-26' },
  { id:'D10', district:'PITAMPURA',     d1:77488, d2_5:3141,  d6_30:895,  d31_90:206,  d91_180:108, d180:472,  never:1127, drift:2, total:83439,  pct:92.87, lastUpdated:'2025-12-26' },
  { id:'D11', district:'ROHINI',        d1:50332, d2_5:4384,  d6_30:1578, d31_90:521,  d91_180:232, d180:565,  never:1002, drift:0, total:58614,  pct:85.87, lastUpdated:'2025-12-26' },
  { id:'D12', district:'SHALIMAR BAGH', d1:87491, d2_5:10993, d6_30:3299, d31_90:463,  d91_180:233, d180:859,  never:1907, drift:4, total:105249, pct:83.13, lastUpdated:'2025-12-26' },
]

const SEED_METER_TYPES: MeterTypeRow[] = [
  { id:'M01', type:'DT Meters',   d1:5259,   d2_5:197,   d6_30:270,   gt30:1504,  never:240,  drift:2,  total:7472,   pct:70.38, color:'#f59e0b' },
  { id:'M02', type:'HT Meters',   d1:1788,   d2_5:23,    d6_30:57,    gt30:13,    never:120,  drift:0,  total:2001,   pct:89.36, color:'#10b981' },
  { id:'M03', type:'SP Meters',   d1:439687, d2_5:46211, d6_30:15217, gt30:11859, never:9134, drift:11, total:522119, pct:84.21, color:'#3b82f6' },
  { id:'M04', type:'LTCT Meters', d1:23170,  d2_5:466,   d6_30:894,   gt30:202,   never:143,  drift:0,  total:24875,  pct:93.15, color:'#8b5cf6' },
  { id:'M05', type:'PPWC Meters', d1:80038,  d2_5:3869,  d6_30:2685,  gt30:1259,  never:1979, drift:5,  total:89835,  pct:89.09, color:'#ec4899' },
]

const SEED_UPDATES: DailyUpdate[] = [
  { id:'U01', date:'2025-12-26', district:'PITAMPURA',    note:'Communication rate improved after NIC firmware patch v2.3.1',  delta:0.8,  type:'improvement' },
  { id:'U02', date:'2025-12-25', district:'SHALIMAR BAGH',note:'RF Mesh outage in sector 7 — resolved within 6 hours',         delta:-1.2, type:'degradation'  },
  { id:'U03', date:'2025-12-24', district:'KESHAVPURAM',  note:'HES backend sync completed — 320 stale meters recovered',       delta:0.4,  type:'improvement'  },
  { id:'U04', date:'2025-12-23', district:'NARELA',       note:'Routine meter audit — 42 tampered meters flagged (TD status)',  delta:-0.1, type:'neutral'       },
  { id:'U05', date:'2025-12-22', district:'CIVIL LINES',  note:'4G backhaul upgrade completed — latency reduced to <2s',       delta:0.5,  type:'improvement'  },
]

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [districts, setDistrictsState] = useState<DistrictRow[]>(() => 
    loadLocal('smd:districts', SEED_DISTRICTS)
  )
  const [meterTypes, setMeterTypesState] = useState<MeterTypeRow[]>(() => 
    loadLocal('smd:meterTypes', SEED_METER_TYPES)
  )
  const [updates, setUpdatesState] = useState<DailyUpdate[]>(() => 
    loadLocal('smd:updates', SEED_UPDATES)
  )
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const setDistricts = (rows: DistrictRow[]) => {
    setDistrictsState(rows)
    saveLocal('smd:districts', rows)
    setLastUpdated(new Date())
  }

  const setMeterTypes = (rows: MeterTypeRow[]) => {
    setMeterTypesState(rows)
    saveLocal('smd:meterTypes', rows)
    setLastUpdated(new Date())
  }

  const setUpdates = (rows: DailyUpdate[]) => {
    setUpdatesState(rows)
    saveLocal('smd:updates', rows)
    setLastUpdated(new Date())
  }

  const value: DashboardContextType = {
    districts,
    meterTypes,
    updates,
    setDistricts,
    setMeterTypes,
    setUpdates,
    lastUpdated
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export const useDashboard = () => {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
