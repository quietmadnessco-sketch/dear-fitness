import { useState } from 'react'
import { uid, DAYS, daysAgo } from '../lib/storage'
import Card from '../components/Card'

function AddExerciseForm({ defaultDay, defaultRest, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [low, setLow] = useState(8)
  const [high, setHigh] = useState(12)
  const [rest, setRest] = useState(defaultRest || 90)
  const input = 'w-full bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal'

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" className={input} />
        <select value={day} onChange={(e) => setDay(e.target.value)} className={input}>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-slate">Rep low
          <input type="number" value={low} onChange={(e) => setLow(+e.target.value)} className={`${input} mt-1`} /></label>
        <label className="text-xs text-slate">Rep high
          <input type="number" value={high} onChange={(e) => setHigh(+e.target.value)} className={`${input} mt-1`} /></label>
        <label className="text-xs text-slate">Rest (sec)
          <input type="number" value={rest} onChange={(e) => setRest(+e.target.value)} className={`${input} mt-1`} /></label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-lg border border-white/10 text-slate px-4 py-2 text-sm">Cancel</button>
        <button
          disabled={!name.trim()}
          onClick={() => name.trim() && onAdd({ id: uid(), name: name.trim(), day, repRangeLow: low, repRangeHigh: high, restSeconds: rest })}
          className="rounded-lg bg-signal text-ink px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Add exercise
        </button>
      </div>
    </Card>
  )
}

function SetLogger({ exercise, state, setState, onRestStart }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [prBanner, setPrBanner] = useState(null)
  const todayStr = new Date().toDateString()

  const allLogs = state.workoutLogs.filter((l) => l.exerciseId === exercise.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const pastLogs = allLogs.filter((l) => l.date !== todayStr)
  const last = pastLogs[0] || null
  const todaysLog = state.workoutLogs.find((l) => l.exerciseId === exercise.id && l.date === todayStr)
  const prevBest = pastLogs.flatMap((l) => l.sets).reduce((m, s) => Math.max(m, s.weight), 0)
  const bestRepsAtWeight = (w) => pastLogs.flatMap((l) => l.sets).filter((s) => s.weight === w).reduce((m, s) => Math.max(m, s.reps), 0)
  const bestSessionVolume = pastLogs.length ? Math.max(...pastLogs.map((l) => l.sets.reduce((s, set) => s + set.weight * set.reps, 0))) : 0

  const lastThree = pastLogs.slice(0, 3)
  const readyToProgress = lastThree.length >= 3 && lastThree.every(
    (l) => l.sets.length > 0 && l.sets.every((s) => s.weight === prevBest && s.reps >= exercise.repRangeHigh)
  )

  const bestEverLog = pastLogs.reduce((best, l) => {
    const top = Math.max(...l.sets.map((s) => s.weight))
    return !best || top >= best.top ? { date: l.date, top } : best
  }, null)
  const plateauDays = state.settings.plateauDays
  const stalled = bestEverLog && daysAgo(bestEverLog.date) >= plateauDays && pastLogs.length > 0 && daysAgo(pastLogs[0].date) <= 14

  const input = 'flex-1 bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal tabular'

  const logSet = () => {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (!w || !r) return
    const repPr = r > bestRepsAtWeight(w)
    const weightPr = w > prevBest

    setState((s) => {
      const existing = s.workoutLogs.find((l) => l.exerciseId === exercise.id && l.date === todayStr)
      let workoutLogs, streak = s.streak
      if (existing) {
        workoutLogs = s.workoutLogs.map((l) => (l.id === existing.id ? { ...l, sets: [...l.sets, { weight: w, reps: r }] } : l))
      } else {
        workoutLogs = [...s.workoutLogs, { id: uid(), exerciseId: exercise.id, date: todayStr, sets: [{ weight: w, reps: r }] }]
        streak = {
          current: s.streak.lastWorkoutDate === todayStr ? s.streak.current : s.streak.current + 1,
          longest: Math.max(s.streak.longest, s.streak.current + 1),
          lastWorkoutDate: todayStr,
        }
      }
      const updatedLog = workoutLogs.find((l) => l.exerciseId === exercise.id && l.date === todayStr)
      const sessionVolume = updatedLog.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
      const volumePr = sessionVolume > bestSessionVolume
      queueMicrotask(() => {
        if (weightPr) setPrBanner({ text: `New weight PR — ${w}kg` })
        else if (repPr) setPrBanner({ text: `New rep PR at ${w}kg — ${r} reps` })
        else if (volumePr) setPrBanner({ text: `New session volume PR — ${sessionVolume.toLocaleString()}kg` })
      })
      return { ...s, workoutLogs, streak }
    })
    setReps('')
    onRestStart(exercise.restSeconds)
  }

  return (
    <Card className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <h3 className="font-display text-base">{exercise.name}</h3>
        <div className="flex items-center gap-2">
          {stalled && (
            <span className="text-[10px] font-semibold text-[#E8B84B] border border-[#E8B84B]/40 bg-[#E8B84B]/10 rounded-full px-2 py-0.5">
              STALLED {plateauDays}D+
            </span>
          )}
          <span className="text-xs text-slate">{exercise.repRangeLow}–{exercise.repRangeHigh} reps</span>
        </div>
      </div>

      {last && <p className="text-xs text-slate">Last time: {last.sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</p>}

      {readyToProgress && !prBanner && (
        <div className="rounded-lg bg-moss/15 border border-moss/40 px-3 py-2 text-xs text-moss font-medium">
          You've hit the top of your rep range 3 sessions running — try +2.5kg next time.
        </div>
      )}
      {prBanner && <div className="rounded-lg bg-signal/15 border border-signal/40 px-3 py-2 text-xs text-signal font-medium">{prBanner.text}</div>}

      {todaysLog && todaysLog.sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {todaysLog.sets.map((s, i) => (
            <span key={i} className="tabular rounded-full bg-moss/20 text-moss text-xs px-2.5 py-1 font-medium">{s.weight}kg × {s.reps}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal" placeholder="kg" className={input} />
        <input value={reps} onChange={(e) => setReps(e.target.value)} type="number" inputMode="numeric" placeholder="reps" className={input} />
        <button onClick={logSet} className="rounded-lg bg-signal text-ink px-4 text-sm font-semibold">Log</button>
      </div>
    </Card>
  )
}

export default function Workout({ store, onRest }) {
  const [state, setState] = store
  const [adding, setAdding] = useState(false)
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const [viewDay, setViewDay] = useState(todayName)
  const list = state.exercises.filter((e) => e.day === viewDay)

  return (
    <div className="p-8 space-y-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setViewDay(d)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium border ${
              viewDay === d ? 'bg-signal text-ink border-signal' : 'border-white/10 text-slate'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {list.map((ex) => (
          <SetLogger key={ex.id} exercise={ex} state={state} setState={setState} onRestStart={(sec) => onRest({ name: ex.name, seconds: sec, key: uid() })} />
        ))}
      </div>

      {list.length === 0 && !adding && <p className="text-sm text-slate">No exercises planned for {viewDay} yet.</p>}

      {adding ? (
        <AddExerciseForm
          defaultDay={viewDay}
          defaultRest={state.settings.defaultRestSeconds}
          onCancel={() => setAdding(false)}
          onAdd={(ex) => {
            setState((s) => ({ ...s, exercises: [...s.exercises, ex] }))
            setAdding(false)
          }}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="rounded-xl border border-dashed border-white/20 text-slate px-4 py-2.5 text-sm font-medium">
          + Add exercise to {viewDay}
        </button>
      )}
    </div>
  )
}
