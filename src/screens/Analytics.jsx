import Card, { StatCard } from '../components/Card'
import { daysAgo } from '../lib/storage'

function Heatmap({ workoutDates, skipDates, weeks = 8 }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = weeks * 7
  const days = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toDateString()
    let status = 'none'
    if (workoutDates.has(key)) status = 'workout'
    else if (skipDates.has(key)) status = 'skip'
    days.push({ date: d, status })
  }
  const cols = []
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7))
  const colorFor = (s) => (s === 'workout' ? '#FF6A3D' : s === 'skip' ? '#3A3040' : '#232D3B')

  return (
    <div>
      <div className="flex gap-1">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((d, di) => (
              <div key={di} title={`${d.date.toDateString()} — ${d.status}`} style={{ background: colorFor(d.status) }} className="w-3.5 h-3.5 rounded-[3px]" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-signal inline-block" />Trained</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#3A3040] inline-block" />Skipped</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#232D3B] inline-block" />No entry</span>
      </div>
    </div>
  )
}

export default function Analytics({ store }) {
  const [state] = store
  const workoutDates = new Set(state.workoutLogs.map((l) => l.date))
  const skipDates = new Set(state.skipLogs.map((s) => s.date))

  const totalWorkoutDays = workoutDates.size
  const totalSets = state.workoutLogs.reduce((s, l) => s + l.sets.length, 0)
  const totalVolume = state.workoutLogs.reduce((s, l) => s + l.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0)

  const last30Workout = [...workoutDates].filter((d) => daysAgo(d) <= 29).length
  const last30Skip = [...skipDates].filter((d) => daysAgo(d) <= 29).length
  const consistency = last30Workout + last30Skip > 0 ? Math.round((last30Workout / (last30Workout + last30Skip)) * 100) : null

  const plateauDays = state.settings.plateauDays
  const plateaus = state.exercises
    .map((ex) => {
      const logs = state.workoutLogs.filter((l) => l.exerciseId === ex.id).sort((a, b) => new Date(a.date) - new Date(b.date))
      if (logs.length === 0) return null
      let bestSoFar = 0, bestDate = null
      logs.forEach((l) => {
        const top = Math.max(...l.sets.map((s) => s.weight))
        if (top > bestSoFar) { bestSoFar = top; bestDate = l.date }
      })
      const mostRecent = logs[logs.length - 1]
      const stalled = bestDate && daysAgo(bestDate) >= plateauDays && daysAgo(mostRecent.date) <= 14
      return stalled ? { name: ex.name, sinceDays: daysAgo(bestDate), weight: bestSoFar } : null
    })
    .filter(Boolean)

  const prRows = state.exercises
    .map((ex) => {
      const logs = state.workoutLogs.filter((l) => l.exerciseId === ex.id)
      let best = null
      logs.forEach((l) => l.sets.forEach((s) => { if (best === null || s.weight > best) best = s.weight }))
      return { name: ex.name, best }
    })
    .filter((r) => r.best !== null)
    .sort((a, b) => b.best - a.best)

  const historyRows = [...state.workoutLogs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((l) => {
      const ex = state.exercises.find((e) => e.id === l.exerciseId)
      const volume = l.sets.reduce((s, set) => s + set.weight * set.reps, 0)
      return { date: l.date, name: ex ? ex.name : 'Deleted exercise', sets: l.sets, volume }
    })

  return (
    <div className="p-8 space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total workout days" value={totalWorkoutDays} />
        <StatCard label="Total sets logged" value={totalSets} />
        <StatCard label="Total volume" value={totalVolume.toLocaleString()} unit="kg" />
        <StatCard label="Longest streak" value={state.streak.longest} unit="days" />
      </div>

      {plateaus.length > 0 && (
        <Card className="border-[#E8B84B]/40 bg-[#E8B84B]/[0.08]">
          <p className="text-xs uppercase tracking-wide text-[#E8B84B]">Stuck on the same weight {plateauDays}+ days</p>
          <div className="mt-2.5 space-y-2">
            {plateaus.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-slate">{p.weight}kg for {p.sinceDays} days — consider a variation or deload</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex justify-between items-center">
          <p className="text-xs uppercase tracking-wide text-slate">Last 8 weeks</p>
          {consistency !== null && (
            <p className="text-sm"><span className="font-display text-base text-signal">{consistency}%</span> <span className="text-slate">consistency (30d)</span></p>
          )}
        </div>
        <div className="mt-3.5"><Heatmap workoutDates={workoutDates} skipDates={skipDates} /></div>
      </Card>

      <div className="grid grid-cols-[1fr_1.4fr] gap-4 items-start">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate mb-2.5">All-time PRs</p>
          {prRows.length === 0 ? <p className="text-sm text-slate">No PRs yet.</p> : prRows.map((r, i) => (
            <div key={i} className="flex justify-between border-b border-white/10 py-2">
              <span className="text-sm">{r.name}</span>
              <span className="tabular text-sm text-signal font-semibold">{r.best}kg</span>
            </div>
          ))}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate mb-2.5">Full workout history</p>
          <div className="max-h-96 overflow-y-auto">
            {historyRows.length === 0 ? <p className="text-sm text-slate">No workouts logged yet.</p> : historyRows.map((r, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-white/10 py-2">
                <div className="min-w-0">
                  <p className="text-sm">{r.name}</p>
                  <p className="text-[11px] text-slate mt-0.5">{r.sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="tabular text-xs">{r.volume.toLocaleString()}kg</p>
                  <p className="text-[11px] text-slate mt-0.5">{r.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
