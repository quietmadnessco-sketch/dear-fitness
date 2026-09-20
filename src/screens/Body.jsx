import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { uid, kgToLb, lbToKg, cmToIn, inToCm, formatWeight, formatLength } from '../lib/storage'
import Card, { StatCard } from '../components/Card'

const MEASURE_TYPES = ['Waist', 'Chest', 'Hips', 'Thigh', 'Arms', 'Calves', 'Shoulders', 'Neck']

export default function Body({ store }) {
  const [state, setState] = store
  const weightUnit = state.settings.weightUnit
  const measurementUnit = state.settings.measurementUnit
  const [weight, setWeight] = useState('')
  const [mType, setMType] = useState(MEASURE_TYPES[0])
  const [mValue, setMValue] = useState('')
  const input = 'flex-1 bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal tabular'

  const setWeightUnit = (u) => setState((s) => ({ ...s, settings: { ...s.settings, weightUnit: u } }))
  const setMeasurementUnit = (u) => setState((s) => ({ ...s, settings: { ...s.settings, measurementUnit: u } }))

  // every entry kept — sorted newest first for the list, oldest first for the chart
  const sorted = [...state.bodyLogs].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date))

  // group by calendar day, average multiple same-day entries, for trend + 7-day average
  const byDay = {}
  sorted.forEach((l) => {
    byDay[l.date] = byDay[l.date] || []
    byDay[l.date].push(l.weightKg)
  })
  const dailyAverages = Object.entries(byDay).map(([date, vals]) => ({
    date,
    avgKg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }))
  const last7Days = dailyAverages.slice(-7)
  const avg7Kg = last7Days.length ? last7Days.reduce((s, d) => s + d.avgKg, 0) / last7Days.length : null
  const latestEntry = sorted[sorted.length - 1]

  const chartData = dailyAverages.slice(-30).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    weight: weightUnit === 'lb' ? kgToLb(d.avgKg) : d.avgKg,
  }))

  const logWeight = () => {
    const raw = parseFloat(weight)
    if (!raw) return
    const kg = weightUnit === 'lb' ? lbToKg(raw) : raw
    const now = new Date()
    setState((s) => ({
      ...s,
      bodyLogs: [...s.bodyLogs, { id: uid(), date: now.toDateString(), time: now.toISOString(), weightKg: kg }],
    }))
    setWeight('')
  }

  const deleteBodyLog = (id) => setState((s) => ({ ...s, bodyLogs: s.bodyLogs.filter((l) => l.id !== id) }))

  const logMeasurement = () => {
    const raw = parseFloat(mValue)
    if (!raw) return
    const cmVal = measurementUnit === 'in' ? inToCm(raw) : raw
    const now = new Date()
    setState((s) => ({
      ...s,
      measurementLogs: [{ id: uid(), date: now.toDateString(), time: now.toISOString(), type: mType, valueCm: cmVal }, ...s.measurementLogs],
    }))
    setMValue('')
  }

  const deleteMeasurement = (id) => setState((s) => ({ ...s, measurementLogs: s.measurementLogs.filter((m) => m.id !== id) }))

  const measurementLogs = [...state.measurementLogs].sort((a, b) => new Date(b.time || b.date) - new Date(a.time || a.date))
  const latestByType = MEASURE_TYPES.map((t) => {
    const rows = measurementLogs.filter((m) => m.type === t)
    const first = [...rows].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date))[0]
    const latestM = rows[0]
    const change = latestM && first && latestM.id !== first.id ? latestM.valueCm - first.valueCm : null
    return { type: t, latest: latestM, change }
  }).filter((r) => r.latest)

  const unitToggle = (value, onA, onB, labelA, labelB) => (
    <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs font-medium">
      <button onClick={onA} className={`px-3 py-1.5 ${value === labelA.toLowerCase() ? 'bg-signal text-ink' : 'text-slate'}`}>{labelA}</button>
      <button onClick={onB} className={`px-3 py-1.5 ${value === labelB.toLowerCase() ? 'bg-signal text-ink' : 'text-slate'}`}>{labelB}</button>
    </div>
  )

  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-display text-base font-semibold">Weight</p>
        {unitToggle(weightUnit, () => setWeightUnit('kg'), () => setWeightUnit('lb'), 'Kg', 'Lb')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Latest" value={latestEntry ? formatWeight(latestEntry.weightKg, weightUnit) : '—'} unit={latestEntry ? weightUnit : ''} />
        <StatCard label="7-day average" value={avg7Kg !== null ? formatWeight(avg7Kg, weightUnit) : '—'} unit={avg7Kg !== null ? weightUnit : ''} />
      </div>

      {chartData.length > 1 && (
        <Card className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v.toFixed(1)} ${weightUnit}`, 'weight']} />
              <Line type="monotone" dataKey="weight" stroke="#3D8361" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <p className="text-xs text-slate">Judge the trend, not one weigh-in — the daily average smooths out water and food noise. Every entry is kept, even multiple per day.</p>

      <Card className="flex gap-2.5 items-end max-w-md">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate mb-1.5">Log a weigh-in</p>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder={weightUnit} className={input} />
        </div>
        <button onClick={logWeight} className="rounded-lg bg-signal text-ink px-5 py-2.5 text-sm font-semibold">Log</button>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-wide text-slate mb-2.5">Weigh-in history</p>
        <div className="max-h-64 overflow-y-auto">
          {sorted.length === 0 ? <p className="text-sm text-slate">No entries yet.</p> : [...sorted].reverse().map((l) => (
            <div key={l.id} className="flex justify-between items-center border-b border-white/10 py-2">
              <div>
                <p className="text-sm tabular">{formatWeight(l.weightKg, weightUnit)} {weightUnit}</p>
                <p className="text-[11px] text-slate">{new Date(l.time || l.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => deleteBodyLog(l.id)} className="text-xs text-slate hover:text-signal">Delete</button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <p className="font-display text-base font-semibold">Measurements</p>
        {unitToggle(measurementUnit, () => setMeasurementUnit('cm'), () => setMeasurementUnit('in'), 'Cm', 'In')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wide text-slate">Log a measurement</p>
          <select value={mType} onChange={(e) => setMType(e.target.value)} className={input.replace('flex-1', 'w-full')}>
            {MEASURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={mValue} onChange={(e) => setMValue(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder={measurementUnit} className={input} />
            <button onClick={logMeasurement} className="rounded-lg bg-signal text-ink px-4 text-sm font-semibold">Log</button>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-slate mb-2.5">Current &amp; change</p>
          {latestByType.length === 0 ? <p className="text-sm text-slate">No measurements logged yet.</p> : latestByType.map((r) => (
            <div key={r.type} className="flex justify-between border-b border-white/10 py-1.5">
              <span className="text-sm">{r.type}</span>
              <span className="tabular text-sm">
                {formatLength(r.latest.valueCm, measurementUnit)}{measurementUnit}{' '}
                {r.change !== null && (
                  <span className={`text-[11px] ml-1.5 ${r.change < 0 ? 'text-moss' : r.change > 0 ? 'text-signal' : 'text-slate'}`}>
                    ({r.change > 0 ? '+' : ''}{formatLength(Math.abs(r.change), measurementUnit)})
                  </span>
                )}
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-wide text-slate mb-2.5">Measurement history</p>
        <div className="max-h-64 overflow-y-auto">
          {measurementLogs.length === 0 ? <p className="text-sm text-slate">No entries yet.</p> : measurementLogs.map((m) => (
            <div key={m.id} className="flex justify-between items-center border-b border-white/10 py-2">
              <div>
                <p className="text-sm">{m.type} — <span className="tabular">{formatLength(m.valueCm, measurementUnit)}{measurementUnit}</span></p>
                <p className="text-[11px] text-slate">{new Date(m.time || m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <button onClick={() => deleteMeasurement(m.id)} className="text-xs text-slate hover:text-signal">Delete</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
