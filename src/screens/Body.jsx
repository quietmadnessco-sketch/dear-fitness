import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { uid } from '../lib/storage'
import Card, { StatCard } from '../components/Card'

const MEASURE_TYPES = ['Waist', 'Chest', 'Hips', 'Thigh', 'Arms', 'Calves', 'Shoulders', 'Neck']

export default function Body({ store }) {
  const [state, setState] = store
  const [weight, setWeight] = useState('')
  const [mType, setMType] = useState(MEASURE_TYPES[0])
  const [mValue, setMValue] = useState('')
  const input = 'flex-1 bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal tabular'

  const sorted = [...state.bodyLogs].sort((a, b) => new Date(a.date) - new Date(b.date))
  const last7 = sorted.slice(-7)
  const avg7 = last7.length ? (last7.reduce((s, l) => s + l.weightKg, 0) / last7.length).toFixed(1) : null
  const latest = sorted[sorted.length - 1]
  const chartData = sorted.slice(-30).map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    weight: l.weightKg,
  }))

  const logWeight = () => {
    const w = parseFloat(weight)
    if (!w) return
    const today = new Date().toDateString()
    setState((s) => ({ ...s, bodyLogs: [...s.bodyLogs.filter((l) => l.date !== today), { id: uid(), date: today, weightKg: w }] }))
    setWeight('')
  }

  const logMeasurement = () => {
    const v = parseFloat(mValue)
    if (!v) return
    setState((s) => ({ ...s, measurementLogs: [{ id: uid(), date: new Date().toDateString(), type: mType, valueCm: v }, ...s.measurementLogs] }))
    setMValue('')
  }

  const measurementLogs = state.measurementLogs || []
  const latestByType = MEASURE_TYPES.map((t) => {
    const rows = measurementLogs.filter((m) => m.type === t).sort((a, b) => new Date(b.date) - new Date(a.date))
    const first = [...measurementLogs].filter((m) => m.type === t).sort((a, b) => new Date(a.date) - new Date(b.date))[0]
    const latestM = rows[0]
    const change = latestM && first && latestM.id !== first.id ? latestM.valueCm - first.valueCm : null
    return { type: t, latest: latestM, change }
  }).filter((r) => r.latest)

  return (
    <div className="p-8 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Latest" value={latest ? latest.weightKg : '—'} unit={latest ? 'kg' : ''} />
        <StatCard label="7-day average" value={avg7 || '—'} unit={avg7 ? 'kg' : ''} />
      </div>

      {chartData.length > 1 && (
        <Card className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="#3D8361" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <p className="text-xs text-slate">Judge the trend, not one weigh-in — the average smooths out daily water and food noise.</p>

      <Card className="flex gap-2.5 items-end max-w-md">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate mb-1.5">Log today's weight</p>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder="kg" className={input} />
        </div>
        <button onClick={logWeight} className="rounded-lg bg-signal text-ink px-5 py-2.5 text-sm font-semibold">Log</button>
      </Card>

      <p className="font-display text-base font-semibold pt-1">Measurements</p>
      <div className="grid grid-cols-2 gap-4">
        <Card className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wide text-slate">Log a measurement</p>
          <select value={mType} onChange={(e) => setMType(e.target.value)} className={input.replace('flex-1', 'w-full')}>
            {MEASURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={mValue} onChange={(e) => setMValue(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder="cm" className={input} />
            <button onClick={logMeasurement} className="rounded-lg bg-signal text-ink px-4 text-sm font-semibold">Log</button>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-slate mb-2.5">Current &amp; change</p>
          {latestByType.length === 0 ? <p className="text-sm text-slate">No measurements logged yet.</p> : latestByType.map((r) => (
            <div key={r.type} className="flex justify-between border-b border-white/10 py-1.5">
              <span className="text-sm">{r.type}</span>
              <span className="tabular text-sm">
                {r.latest.valueCm}cm{' '}
                {r.change !== null && (
                  <span className={`text-[11px] ml-1.5 ${r.change < 0 ? 'text-moss' : r.change > 0 ? 'text-signal' : 'text-slate'}`}>
                    ({r.change > 0 ? '+' : ''}{r.change.toFixed(1)})
                  </span>
                )}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
