import { useState } from 'react'
import { DEFAULT } from '../lib/storage'
import Card from '../components/Card'

export default function Settings({ store }) {
  const [state, setState] = store
  const s = state.settings
  const [weeklyGoal, setWeeklyGoal] = useState(s.weeklyGoal)
  const [plateauDays, setPlateauDays] = useState(s.plateauDays)
  const [defaultRest, setDefaultRest] = useState(s.defaultRestSeconds)
  const [saved, setSaved] = useState(false)
  const input = 'w-[100px] bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal'

  const save = () => {
    setState((st) => ({
      ...st,
      settings: { weeklyGoal: +weeklyGoal || 5, plateauDays: +plateauDays || 60, defaultRestSeconds: +defaultRest || 90 },
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const deleteExercise = (id) => {
    setState((st) => ({
      ...st,
      exercises: st.exercises.filter((e) => e.id !== id),
      workoutLogs: st.workoutLogs.filter((l) => l.exerciseId !== id),
    }))
  }

  const resetAll = () => {
    if (window.confirm('This clears everything — exercises, logs, body data, skips. This cannot be undone. Continue?')) {
      setState(() => structuredClone(DEFAULT))
    }
  }

  return (
    <div className="p-8 space-y-4 max-w-2xl">
      <Card className="space-y-3.5">
        <p className="text-xs uppercase tracking-wide text-slate">Training targets</p>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm">Weekly workout goal</p>
            <p className="text-xs text-slate mt-0.5">Used for the progress bar on Overview</p>
          </div>
          <input type="number" min="1" max="7" value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} className={input} />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm">Plateau threshold (days)</p>
            <p className="text-xs text-slate mt-0.5">No weight PR for this long → flagged as stalled</p>
          </div>
          <input type="number" min="7" value={plateauDays} onChange={(e) => setPlateauDays(e.target.value)} className={input} />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm">Default rest timer (seconds)</p>
            <p className="text-xs text-slate mt-0.5">Used when adding a new exercise — override per exercise anytime</p>
          </div>
          <input type="number" min="15" step="5" value={defaultRest} onChange={(e) => setDefaultRest(e.target.value)} className={input} />
        </div>

        <div className="flex gap-2.5 items-center pt-1">
          <button onClick={save} className="rounded-lg bg-signal text-ink px-4 py-2 text-sm font-semibold">Save settings</button>
          {saved && <span className="text-xs text-moss">Saved.</span>}
        </div>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-wide text-slate mb-2.5">Manage exercises</p>
        {state.exercises.length === 0 ? (
          <p className="text-sm text-slate">No exercises added yet.</p>
        ) : (
          state.exercises.map((ex) => (
            <div key={ex.id} className="flex justify-between items-center border-b border-white/10 py-2.5">
              <div>
                <p className="text-sm">{ex.name}</p>
                <p className="text-xs text-slate mt-0.5">{ex.day} · {ex.repRangeLow}–{ex.repRangeHigh} reps · {ex.restSeconds}s rest</p>
              </div>
              <button onClick={() => deleteExercise(ex.id)} className="text-xs text-signal">Remove</button>
            </div>
          ))
        )}
      </Card>

      <Card className="border-signal/30">
        <p className="text-xs uppercase tracking-wide text-signal">Danger zone</p>
        <p className="text-xs text-slate mt-2 mb-3">Wipes all local data on this device. Export a backup first if you want to keep it.</p>
        <button onClick={resetAll} className="rounded-lg border border-signal/40 text-signal px-4 py-2 text-sm font-semibold">Reset all data</button>
      </Card>
    </div>
  )
}
