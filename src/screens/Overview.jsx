import Card, { StatCard } from '../components/Card'
import { daysAgo } from '../lib/storage'

export default function Overview({ store, onGo }) {
  const [state] = store
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todays = state.exercises.filter((e) => e.day === todayName)
  const last7 = state.workoutLogs.filter((l) => daysAgo(l.date) <= 6)
  const workoutDaysThisWeek = new Set(last7.map((l) => l.date)).size
  const weeklyGoal = state.settings.weeklyGoal
  const totalSets = last7.reduce((s, l) => s + l.sets.length, 0)
  const totalVolume = last7.reduce((s, l) => s + l.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0)
  const recentSkips = state.skipLogs.filter((s) => daysAgo(s.date) <= 6).length
  const latestBody = [...state.bodyLogs].sort((a, b) => new Date(b.date) - new Date(a.date))[0]

  const streak = state.streak.current
  const flame = streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : streak > 0 ? '🔥' : '⚪'
  const badges = [
    { threshold: 3, label: '3-day streak' },
    { threshold: 7, label: '1 week streak' },
    { threshold: 14, label: '2 week streak' },
    { threshold: 30, label: '30-day streak' },
  ].map((b) => ({ ...b, earned: state.streak.longest >= b.threshold }))

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Sets this week" value={totalSets} />
        <StatCard label="Volume this week" value={totalVolume.toLocaleString()} unit="kg" />
        <StatCard label="Body weight" value={latestBody ? latestBody.weightKg : '—'} unit={latestBody ? 'kg' : ''} />
        <StatCard label="Skipped this week" value={recentSkips} accent={recentSkips > 0 ? '#FF6A3D' : undefined} />
      </div>

      <Card>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{flame}</span>
            <div>
              <p className="font-display text-lg font-semibold">{streak}-day streak</p>
              <p className="text-xs text-slate mt-0.5">Longest: {state.streak.longest} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate">This week</p>
            <p className="font-display text-base mt-0.5 tabular">{workoutDaysThisWeek} / {weeklyGoal} workouts</p>
          </div>
        </div>
        <div className="mt-3.5 h-2 rounded-full bg-ink overflow-hidden">
          <div
            className="h-full bg-signal rounded-full transition-all"
            style={{ width: `${Math.min(100, (workoutDaysThisWeek / weeklyGoal) * 100)}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3.5 flex-wrap">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
                b.earned ? 'border-signal/40 bg-signal/10 text-signal' : 'border-white/10 text-slatedim'
              }`}
            >
              {b.earned ? '✓ ' : '○ '}
              {b.label}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate">Today — {todayName}</p>
          {todays.length === 0 ? (
            <div>
              <p className="text-sm text-slate mt-3 mb-4">No exercises planned for today yet.</p>
              <button onClick={() => onGo('workout')} className="rounded-lg bg-signal text-ink px-4 py-2.5 text-sm font-semibold">
                Plan today's workout
              </button>
            </div>
          ) : (
            <div className="mt-3">
              {todays.map((e) => (
                <div key={e.id} className="flex justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm">{e.name}</span>
                  <span className="text-xs text-slate">{e.repRangeLow}–{e.repRangeHigh} reps</span>
                </div>
              ))}
              <button onClick={() => onGo('workout')} className="mt-3.5 rounded-lg bg-signal text-ink px-4 py-2.5 text-sm font-semibold">
                Go log today's workout
              </button>
            </div>
          )}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate">Skip pattern</p>
          {recentSkips > 0 ? (
            <div>
              <p className="font-display text-2xl mt-2.5 tabular text-signal">{recentSkips}</p>
              <p className="text-xs text-slate mt-0.5 mb-3">days skipped this week</p>
              <button onClick={() => onGo('skips')} className="rounded-lg border border-white/10 px-3.5 py-2 text-xs">
                View skip log
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate mt-3">No skips this week. Good.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
