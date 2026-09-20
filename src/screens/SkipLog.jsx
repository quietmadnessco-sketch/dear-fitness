import { useState } from 'react'
import { uid, daysAgo } from '../lib/storage'
import Card, { StatCard } from '../components/Card'

const REASONS = ['Sick', 'Too busy', 'Low motivation', 'Sore / recovering', 'Travel', 'Other']

export default function SkipLog({ store }) {
  const [state, setState] = store
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')

  const thisMonth = state.skipLogs.filter((s) => daysAgo(s.date) <= 30)
  const counts = thisMonth.reduce((a, s) => { a[s.reason] = (a[s.reason] || 0) + 1; return a }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

  const logSkip = () => {
    setState((s) => ({
      ...s,
      skipLogs: [{ id: uid(), date: new Date().toDateString(), reason, note }, ...s.skipLogs],
      streak: { ...s.streak, current: 0 },
    }))
    setNote('')
  }

  return (
    <div className="p-8 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="This month" value={thisMonth.length} unit="skips" />
        <StatCard label="Top reason" value={top ? top[0] : '—'} accent="#FF6A3D" />
      </div>

      <Card className="space-y-3 max-w-lg">
        <p className="text-xs uppercase tracking-wide text-slate">Log today as skipped</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                reason === r ? 'bg-signal text-ink border-signal' : 'border-white/10 text-slate'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          className="w-full bg-ink border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal"
        />
        <button onClick={logSkip} className="rounded-lg bg-signal text-ink px-4 py-2 text-sm font-semibold">Log skip</button>
      </Card>

      {thisMonth.length >= 4 && (
        <Card className="border-signal/40 bg-signal/[0.08]">
          <p className="text-sm font-medium text-signal">
            {top?.[0] === 'Sick'
              ? 'A few sick days this month — recovery matters more than the streak.'
              : `${thisMonth.length} skipped days this month, mostly "${top?.[0].toLowerCase()}". Might be worth shrinking the plan.`}
          </p>
        </Card>
      )}

      <Card>
        <p className="text-xs uppercase tracking-wide text-slate mb-2.5">Recent</p>
        {state.skipLogs.slice(0, 10).map((s) => (
          <div key={s.id} className="flex justify-between border-b border-white/10 py-2.5">
            <div>
              <p className="text-sm">{s.reason}</p>
              {s.note && <p className="text-xs text-slate">{s.note}</p>}
            </div>
            <p className="text-xs text-slate">{s.date}</p>
          </div>
        ))}
        {state.skipLogs.length === 0 && <p className="text-sm text-slate">No skips logged. Good.</p>}
      </Card>
    </div>
  )
}
