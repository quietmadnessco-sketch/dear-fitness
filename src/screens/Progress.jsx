import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card, { StatCard } from '../components/Card'

export default function Progress({ store }) {
  const [state] = store
  const [selected, setSelected] = useState(state.exercises[0]?.id || null)

  const logs = state.workoutLogs.filter((l) => l.exerciseId === selected).sort((a, b) => new Date(a.date) - new Date(b.date))
  const chartData = logs.map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    topSet: Math.max(...l.sets.map((s) => s.weight)),
  }))
  const bestWeight = logs.length ? Math.max(...logs.flatMap((l) => l.sets.map((s) => s.weight))) : null
  const bestVolume = logs.length ? Math.max(...logs.map((l) => l.sets.reduce((s, set) => s + set.weight * set.reps, 0))) : null

  return (
    <div className="p-8 space-y-4">
      {state.exercises.length === 0 ? (
        <p className="text-sm text-slate">Add exercises in Workout to start seeing progress here.</p>
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto">
            {state.exercises.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium border ${
                  selected === e.id ? 'bg-signal text-ink border-signal' : 'border-white/10 text-slate'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-slate">No sets logged for this exercise yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Best weight" value={bestWeight} unit="kg" />
                <StatCard label="Best session volume" value={bestVolume?.toLocaleString()} unit="kg" />
              </div>

              {chartData.length > 1 && (
                <Card className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="topSet" name="Top set (kg)" stroke="#FF6A3D" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <Card>
                <p className="text-xs uppercase tracking-wide text-slate mb-2.5">History</p>
                <div className="max-h-96 overflow-y-auto">
                  {[...logs].reverse().map((l) => (
                    <div key={l.id} className="flex justify-between border-b border-white/10 py-2">
                      <p className="text-sm">{l.sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</p>
                      <p className="text-xs text-slate shrink-0 ml-3">{l.date}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
