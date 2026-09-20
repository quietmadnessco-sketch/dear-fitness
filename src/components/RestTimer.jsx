import { useEffect, useRef, useState } from 'react'

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // audio unavailable — notification still fires
  }
}

function notify(exerciseName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Rest over', { body: `Back to it — ${exerciseName}`, icon: '/favicon.svg' })
    } catch {
      // ignore
    }
  }
}

/**
 * Two-phase rest panel:
 *  - "pending": shows an editable seconds field pre-filled with the exercise's
 *    default rest, with a Start button. Nothing counts down yet — every set
 *    can get a different rest length since recovery time varies by weight/set.
 *  - "running": counts down from the seconds the user confirmed, beeps +
 *    notifies at zero.
 */
export default function RestTimer({ exerciseName, defaultSeconds, onDone }) {
  const [phase, setPhase] = useState('pending')
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState(defaultSeconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    return () => clearInterval(intervalRef.current)
  }, [])

  const start = () => {
    const s = Math.max(1, parseInt(seconds, 10) || defaultSeconds)
    setSeconds(s)
    setRemaining(s)
    setPhase('running')
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          beep()
          notify(exerciseName)
          onDone?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
  }

  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100

  if (phase === 'pending') {
    return (
      <div className="fixed right-6 bottom-6 z-40">
        <div className="w-[300px] rounded-card bg-inkraise border border-white/10 shadow-2xl shadow-black/40 p-4 flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate">Rest after</p>
            <p className="font-display text-sm mt-0.5">{exerciseName}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && start()}
              className="flex-1 bg-ink border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-signal tabular"
            />
            <span className="text-xs text-slate">sec</span>
            <button onClick={start} className="rounded-lg bg-signal text-ink px-4 py-2 text-sm font-semibold">Start</button>
          </div>
          <button onClick={() => onDone?.()} className="self-start text-xs text-slate">Skip rest</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed right-6 bottom-6 z-40">
      <div className="w-[300px] rounded-card bg-inkraise border border-white/10 shadow-2xl shadow-black/40 p-4 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#2A3444" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="24" fill="none" stroke="#FF6A3D" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-xs tabular">{mm}:{ss}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate">Resting</p>
          <p className="font-display text-sm truncate">{exerciseName}</p>
        </div>
        <button
          onClick={() => { clearInterval(intervalRef.current); onDone?.() }}
          className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
