import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

/* =========================================================================
   DATA LAYER
   Everything lives in localStorage under one key. Single source of truth,
   read once at startup, written on every change.
   ========================================================================= */

const STORAGE_KEY = 'dear-fitness:v2' // unchanged on purpose — don't wipe live user data

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other']

// Common exercises per muscle group — a quick-pick list so most people never
// have to type a name. Anything not here can still be typed manually in the
// name field, which always stays editable.
const EXERCISE_LIBRARY = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Incline Dumbbell Press', 'Flat Dumbbell Press', 'Dumbbell Fly', 'Cable Fly', 'Push-up', 'Chest Dip', 'Machine Chest Press', 'Pec Deck'],
  Back: ['Deadlift', 'Pull-up', 'Chin-up', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Face Pull', 'Hyperextension', 'Rack Pull'],
  Legs: ['Squat', 'Front Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl', 'Walking Lunge', 'Bulgarian Split Squat', 'Hip Thrust', 'Calf Raise', 'Goblet Squat'],
  Shoulders: ['Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Upright Row', 'Shrugs', 'Cable Lateral Raise'],
  Arms: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Close-Grip Bench Press', 'Dips'],
  Core: ['Plank', 'Crunch', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist', 'Ab Wheel Rollout', 'Sit-up', 'Mountain Climber'],
  Other: [],
}
const MEASURE_TYPES = ['Chest', 'Shoulders', 'Back', 'Biceps', 'Forearms', 'Waist', 'Hips', 'Thighs', 'Calves', 'Neck']
const SKIP_REASONS = ['Sick', 'Too busy', 'Low motivation', 'Sore / recovering', 'Travel', 'Other']

const DEFAULT_STATE = {
  exercises: [], // { id, name, day, muscleGroup, repRangeLow, repRangeHigh, restSeconds }
  workoutLogs: [], // { id, exerciseId, date, sets: [{weight, reps}] }
  bodyLogs: [], // { id, date, time, weightKg } — every entry kept, never overwritten
  measurementLogs: [], // { id, date, time, type, valueCm } — every entry kept
  skipLogs: [], // { id, date, reason, note } — one per calendar day
  streak: { current: 0, longest: 0, lastWorkoutDate: null },
  settings: {
    weeklyGoal: 5,
    plateauDays: 60,
    defaultRestSeconds: 90,
    weightUnit: 'kg', // 'kg' | 'lb'
    measurementUnit: 'cm', // 'cm' | 'in'
  },
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw)
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function useAppState() {
  const [state, setState] = useState(loadState)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage full — keep working in memory */ }
  }, [state])
  return [state, setState]
}

const uid = () => Math.random().toString(36).slice(2, 10)
const daysAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
const kgToLb = (kg) => kg * 2.20462
const lbToKg = (lb) => lb / 2.20462
const cmToIn = (cm) => cm / 2.54
const inToCm = (inch) => inch * 2.54
const fmtW = (kg, unit) => (unit === 'lb' ? kgToLb(kg) : kg).toFixed(1)
const fmtL = (cm, unit) => (unit === 'in' ? cmToIn(cm) : cm).toFixed(1)

/* =========================================================================
   ICONS — small inline SVGs, no external icon font/library needed
   ========================================================================= */

const Icon = {
  home: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></svg>,
  dumbbell: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M6.5 6.5 4 4M17.5 17.5 20 20M6.5 17.5 4 20M17.5 6.5 20 4" /><rect x="6" y="9" width="3" height="6" rx="1" /><rect x="15" y="9" width="3" height="6" rx="1" /><path d="M9 12h6" /></svg>,
  chart: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></svg>,
  menu: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>,
  back: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M15 18l-6-6 6-6" /></svg>,
  chevron: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M9 18l6-6-6-6" /></svg>,
  trash: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" /></svg>,
  scale: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  flag: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M5 21V4M5 4h13l-3 4 3 4H5" /></svg>,
  gear: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  bed: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  download: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" /></svg>,
  upload: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M12 21V9m0 0 4 4m-4-4-4 4M4 5h16" /></svg>,
  plus: (c) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M12 5v14M5 12h14" /></svg>,
}

/* =========================================================================
   SHARED UI PRIMITIVES
   ========================================================================= */

const btnPrimary = "bg-gradient-to-b from-[#FF7D52] to-signal text-ink font-semibold shadow-md shadow-signal/20 active:scale-[0.97] transition-all duration-150"

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function StatBlock({ label, value, unit, accent, delta }) {
  return (
    <Card>
      <p className="text-[11px] uppercase tracking-wide text-slate font-medium">{label}</p>
      <p className="font-display text-[26px] font-semibold mt-1.5 tabular-nums" style={accent ? { color: accent } : undefined}>
        {value} {unit && <span className="text-sm text-slate font-medium">{unit}</span>}
      </p>
      {delta && <p className={`text-[12px] mt-0.5 font-medium ${delta.good ? 'text-moss' : 'text-signal'}`}>{delta.text}</p>}
    </Card>
  )
}

function ScreenHeader({ title, subtitle }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="font-display text-[24px] font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-[13px] text-slate mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-all duration-150 ${
        active ? 'bg-signal text-ink border-signal shadow-md shadow-signal/30 scale-[1.02]' : 'border-white/10 text-slate hover:border-white/20'
      }`}
    >
      {children}
    </button>
  )
}

function TextField(props) {
  return (
    <input
      {...props}
      className="w-full bg-ink border border-white/10 rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-signal focus:ring-4 focus:ring-signal/10 transition-all placeholder:text-slatedim"
    />
  )
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 600)
  } catch { /* no audio available — silent fail is fine */ }
}
function notifyRestOver(exerciseName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Rest over', { body: `Back to it — ${exerciseName}` }) } catch { /* ignore */ }
  }
}

/* =========================================================================
   HOME
   ========================================================================= */

function HomeScreen({ state, goTo }) {
  const last7 = state.workoutLogs.filter((l) => daysAgo(l.date) <= 6)
  const workoutDaysThisWeek = new Set(last7.map((l) => l.date)).size
  const weeklyGoal = state.settings.weeklyGoal
  const totalVolume = last7.reduce((s, l) => s + l.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0)
  const alreadyTrainedToday = state.workoutLogs.some((l) => l.date === new Date().toDateString())

  const streak = state.streak.current
  const flame = streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : streak > 0 ? '🔥' : '⚪'
  const badges = [
    { threshold: 3, label: '3-day' }, { threshold: 7, label: '1 week' },
    { threshold: 14, label: '2 week' }, { threshold: 30, label: '30-day' },
  ].map((b) => ({ ...b, earned: state.streak.longest >= b.threshold }))

  const latestBody = state.bodyLogs.length
    ? [...state.bodyLogs].sort((a, b) => new Date(b.time || b.date) - new Date(a.time || a.date))[0]
    : null

  return (
    <div className="pb-4">
      <ScreenHeader title={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
      <div className="px-5 space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{flame}</span>
              <div>
                <p className="font-display text-lg font-semibold">{streak}-day streak</p>
                <p className="text-xs text-slate">Best: {state.streak.longest} days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate">This week</p>
              <p className="font-display text-base tabular-nums">{workoutDaysThisWeek}/{weeklyGoal}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-ink overflow-hidden">
            <div className="h-full bg-signal rounded-full transition-all" style={{ width: `${Math.min(100, (workoutDaysThisWeek / weeklyGoal) * 100)}%` }} />
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {badges.map((b) => (
              <span key={b.label} className={`text-[10px] font-semibold rounded-full px-2 py-1 border ${b.earned ? 'border-signal/40 bg-signal/10 text-signal' : 'border-white/10 text-slatedim'}`}>
                {b.earned ? '✓' : '○'} {b.label}
              </span>
            ))}
          </div>
        </Card>

        <button onClick={() => goTo('workout')} className="w-full rounded-2xl bg-gradient-to-br from-[#FF8259] to-signal text-ink p-5 text-left active:scale-[0.98] transition-transform shadow-lg shadow-signal/25">
          <p className="text-[11px] uppercase tracking-wide font-semibold opacity-70">{alreadyTrainedToday ? 'Done today ✓' : 'Ready to train'}</p>
          <p className="font-display text-xl font-semibold mt-1">{alreadyTrainedToday ? 'Nice work' : 'Start today\u2019s workout'}</p>
          <p className="text-[13px] mt-1 opacity-80">
            {state.exercises.length > 0 ? `${state.exercises.length} exercise${state.exercises.length > 1 ? 's' : ''} in your routine` : 'Nothing set up yet — tap to add exercises'}
          </p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Volume this week" value={totalVolume.toLocaleString()} unit="kg" />
          <StatBlock
            label="Body weight"
            value={latestBody ? fmtW(latestBody.weightKg, state.settings.weightUnit) : '—'}
            unit={latestBody ? state.settings.weightUnit : ''}
          />
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   WORKOUT
   ========================================================================= */

function AddExerciseForm({ defaultRest, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('Chest')
  const [low, setLow] = useState(8)
  const [high, setHigh] = useState(12)
  const [rest, setRest] = useState(defaultRest || 90)
  const libraryOptions = EXERCISE_LIBRARY[group] || []

  return (
    <Card className="space-y-3">
      <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full bg-ink border border-white/10 rounded-xl px-3 py-3 text-[14px] outline-none focus:border-signal">
        {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      {libraryOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {libraryOptions.map((ex) => (
            <Chip key={ex} active={name === ex} onClick={() => setName(ex)}>{ex}</Chip>
          ))}
        </div>
      )}

      <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={libraryOptions.length > 0 ? "Or type a custom name" : "Exercise name"} />

      <div className="grid grid-cols-3 gap-2.5">
        <label className="text-[11px] text-slate">Rep low
          <input type="number" value={low} onChange={(e) => setLow(+e.target.value)} className="mt-1 w-full bg-ink border border-white/10 rounded-xl px-2.5 py-2.5 text-[14px] outline-none focus:border-signal" /></label>
        <label className="text-[11px] text-slate">Rep high
          <input type="number" value={high} onChange={(e) => setHigh(+e.target.value)} className="mt-1 w-full bg-ink border border-white/10 rounded-xl px-2.5 py-2.5 text-[14px] outline-none focus:border-signal" /></label>
        <label className="text-[11px] text-slate">Rest (s)
          <input type="number" value={rest} onChange={(e) => setRest(+e.target.value)} className="mt-1 w-full bg-ink border border-white/10 rounded-xl px-2.5 py-2.5 text-[14px] outline-none focus:border-signal" /></label>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="rounded-xl border border-white/10 text-slate px-4 py-2.5 text-[14px]">Cancel</button>
        <button
          disabled={!name.trim()}
          onClick={() => name.trim() && onAdd({ id: uid(), name: name.trim(), muscleGroup: group, repRangeLow: low, repRangeHigh: high, restSeconds: rest })}
          className="rounded-xl bg-signal text-ink px-4 py-2.5 text-[14px] font-semibold disabled:opacity-40"
        >
          Add exercise
        </button>
      </div>
    </Card>
  )
}

function ExerciseLogCard({ exercise, state, setState }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [prBanner, setPrBanner] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null) // null = logging a new set; number = editing that set's index in today's log
  const [restPhase, setRestPhase] = useState('idle') // idle | prompt | running — ONE control, ONE place
  const [restTarget, setRestTarget] = useState(exercise.restSeconds)
  const [restRemaining, setRestRemaining] = useState(exercise.restSeconds)
  const restInterval = useRef(null)
  const todayStr = new Date().toDateString()

  useEffect(() => () => clearInterval(restInterval.current), [])

  const allLogs = state.workoutLogs.filter((l) => l.exerciseId === exercise.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const pastLogs = allLogs.filter((l) => l.date !== todayStr)
  const last = pastLogs[0] || null
  const todaysLog = state.workoutLogs.find((l) => l.exerciseId === exercise.id && l.date === todayStr)
  const prevBest = pastLogs.flatMap((l) => l.sets).reduce((m, s) => Math.max(m, s.weight), 0)
  const bestRepsAtWeight = (w) => pastLogs.flatMap((l) => l.sets).filter((s) => s.weight === w).reduce((m, s) => Math.max(m, s.reps), 0)
  const bestSessionVolume = pastLogs.length ? Math.max(...pastLogs.map((l) => l.sets.reduce((s, set) => s + set.weight * set.reps, 0))) : 0

  const lastThree = pastLogs.slice(0, 3)
  const readyToProgress = lastThree.length >= 3 && lastThree.every((l) => l.sets.length > 0 && l.sets.every((s) => s.weight === prevBest && s.reps >= exercise.repRangeHigh))

  const bestEverLog = pastLogs.reduce((best, l) => {
    const top = Math.max(...l.sets.map((s) => s.weight))
    return !best || top >= best.top ? { date: l.date, top } : best
  }, null)
  const plateauDays = state.settings.plateauDays
  const stalled = bestEverLog && daysAgo(bestEverLog.date) >= plateauDays && pastLogs.length > 0 && daysAgo(pastLogs[0].date) <= 14

  const restEndAt = useRef(null) // wall-clock timestamp (ms) when rest should end — survives throttled/paused intervals
  const restCompletedRef = useRef(false)

  const tickRest = () => {
    if (!restEndAt.current) return
    const remaining = Math.max(0, Math.ceil((restEndAt.current - Date.now()) / 1000))
    setRestRemaining(remaining)
    if (remaining <= 0 && !restCompletedRef.current) {
      restCompletedRef.current = true
      clearInterval(restInterval.current)
      playBeep()
      notifyRestOver(exercise.name)
      setTimeout(() => setRestPhase('idle'), 1200)
    }
  }

  const startRest = () => {
    restCompletedRef.current = false
    restEndAt.current = Date.now() + restTarget * 1000
    setRestRemaining(restTarget)
    setRestPhase('running')
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    // Ticks every second while the tab is active. Browsers throttle or fully
    // pause setInterval in a backgrounded tab/app, so this alone can't be
    // trusted — the visibilitychange listener below recomputes from the
    // real end timestamp the moment the tab comes back, so the countdown
    // is always correct even if it looked "frozen" while you were away.
    restInterval.current = setInterval(tickRest, 1000)
  }
  const cancelRest = () => { clearInterval(restInterval.current); restEndAt.current = null; setRestPhase('idle') }

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') tickRest() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logSet = () => {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (!w || !r) return

    // Editing an existing set — just correct it in place. No PR check, no rest
    // timer, since this isn't a new set being performed, just a typo fix.
    if (editingIndex !== null) {
      setState((s) => ({
        ...s,
        workoutLogs: s.workoutLogs.map((l) => {
          if (l.exerciseId !== exercise.id || l.date !== todayStr) return l
          return { ...l, sets: l.sets.map((set, i) => (i === editingIndex ? { weight: w, reps: r } : set)) }
        }),
      }))
      setEditingIndex(null)
      setWeight(''); setReps('')
      return
    }

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
        if (weightPr) setPrBanner(`New weight PR — ${w}kg`)
        else if (repPr) setPrBanner(`New rep PR at ${w}kg — ${r} reps`)
        else if (volumePr) setPrBanner(`New session volume PR — ${sessionVolume.toLocaleString()}kg`)
      })
      return { ...s, workoutLogs, streak }
    })
    setReps('')
    // one single inline rest control opens here — nothing floats, nothing duplicates
    setRestTarget(exercise.restSeconds)
    setRestPhase('prompt')
  }

  const editSet = (i) => {
    const set = todaysLog.sets[i]
    setWeight(String(set.weight))
    setReps(String(set.reps))
    setEditingIndex(i)
  }
  const cancelEdit = () => { setEditingIndex(null); setWeight(''); setReps('') }
  const removeSet = (i) => {
    setState((s) => ({
      ...s,
      workoutLogs: s.workoutLogs
        .map((l) => {
          if (l.exerciseId !== exercise.id || l.date !== todayStr) return l
          return { ...l, sets: l.sets.filter((_, idx) => idx !== i) }
        })
        .filter((l) => !(l.exerciseId === exercise.id && l.date === todayStr && l.sets.length === 0)),
    }))
    if (editingIndex === i) cancelEdit()
  }

  return (
    <Card className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <div>
          <h3 className="font-display text-[15px]">{exercise.name}</h3>
          <p className="text-[11px] text-slate mt-0.5">{exercise.muscleGroup} · {exercise.repRangeLow}–{exercise.repRangeHigh} reps</p>
        </div>
        {stalled && (
          <span className="text-[9px] font-semibold text-[#E8B84B] border border-[#E8B84B]/40 bg-[#E8B84B]/10 rounded-full px-2 py-0.5 shrink-0">
            STALLED {plateauDays}D+
          </span>
        )}
      </div>

      {last && <p className="text-[12px] text-slate">Last time: {last.sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</p>}
      {readyToProgress && !prBanner && (
        <div className="rounded-xl bg-moss/15 border border-moss/40 px-3 py-2 text-[12px] text-moss font-medium">
          Top of rep range 3 sessions running — try +2.5kg next time.
        </div>
      )}
      {prBanner && (
        <div className="rounded-xl bg-gradient-to-r from-signal/20 to-signal/5 border border-signal/40 px-3 py-2.5 text-[12px] text-signal font-semibold flex items-center gap-2">
          <span className="text-base leading-none">🔥</span>{prBanner}
        </div>
      )}

      {restPhase === 'prompt' && (
        <div className="rounded-xl bg-ink border border-signal/40 px-3 py-2.5 flex items-center gap-2">
          <span className="text-[13px] text-slate shrink-0">Rest for</span>
          <input type="number" value={restTarget} onChange={(e) => setRestTarget(+e.target.value)} className="w-16 bg-inkraise border border-white/10 rounded-lg px-2 py-1.5 text-[14px] tabular-nums outline-none focus:border-signal text-center" />
          <span className="text-[13px] text-slate shrink-0">sec</span>
          <div className="flex-1" />
          <button onClick={() => setRestPhase('idle')} className="text-[13px] text-slate px-1">Skip</button>
          <button onClick={startRest} className={`${btnPrimary} rounded-lg px-3.5 py-1.5 text-[13px]`}>Start</button>
        </div>
      )}
      {restPhase === 'running' && (
        <div className="rounded-xl bg-ink border border-signal/40 px-3 py-2.5 flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0">
            <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#2A3444" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#FF6A3D" strokeWidth="3.5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 15} strokeDashoffset={2 * Math.PI * 15 * (1 - (restTarget - restRemaining) / restTarget)}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">{restRemaining}</div>
          </div>
          <span className="text-[13px] text-slate flex-1">Resting…</span>
          <button onClick={cancelRest} className="text-[13px] text-slate px-1">Skip</button>
        </div>
      )}

      {todaysLog && todaysLog.sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {todaysLog.sets.map((s, i) => (
            <span key={i} className={`flex items-center gap-1.5 tabular-nums rounded-full text-[12px] pl-2.5 pr-1.5 py-1 font-medium border ${
              editingIndex === i ? 'bg-signal/20 text-signal border-signal/50' : 'bg-moss/20 text-moss border-transparent'
            }`}>
              <button onClick={() => editSet(i)} title="Tap to edit" className="tabular-nums">
                {s.weight}kg × {s.reps}
              </button>
              <button
                onClick={() => removeSet(i)}
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${editingIndex === i ? 'bg-signal/30 text-signal hover:bg-signal/50' : 'bg-moss/30 text-moss hover:bg-moss/50'}`}
                title="Delete this set"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-2.5 h-2.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {editingIndex !== null && (
        <p className="text-[12px] text-signal font-medium flex items-center justify-between">
          Editing set {editingIndex + 1} — fix the numbers below and hit Save
          <button onClick={cancelEdit} className="text-slate underline text-[12px]">Cancel</button>
        </p>
      )}

      <div className="flex gap-2">
        <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal" placeholder="kg"
          className="flex-1 min-w-0 bg-ink border border-white/10 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-signal tabular-nums" />
        <input value={reps} onChange={(e) => setReps(e.target.value)} type="number" inputMode="numeric" placeholder="reps"
          className="flex-1 min-w-0 bg-ink border border-white/10 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-signal tabular-nums" />
        <button onClick={logSet} className={`${btnPrimary} rounded-xl px-4 text-[14px] shrink-0`}>{editingIndex !== null ? 'Save' : 'Log'}</button>
      </div>
    </Card>
  )
}

function WorkoutScreen({ state, setState }) {
  const [adding, setAdding] = useState(false)
  const groupsPresent = ['All', ...MUSCLE_GROUPS.filter((g) => state.exercises.some((e) => e.muscleGroup === g))]
  const [group, setGroup] = useState('All')
  const list = group === 'All' ? state.exercises : state.exercises.filter((e) => e.muscleGroup === group)

  return (
    <div className="pb-4">
      <ScreenHeader title="Workout" subtitle="Your full routine — log any exercise, any day" />
      {state.exercises.length > 0 && (
        <div className="px-5 flex gap-1.5 overflow-x-auto pb-1 mb-1">
          {groupsPresent.map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}
        </div>
      )}
      <div className="px-5 space-y-3 mt-3">
        {list.map((ex) => <ExerciseLogCard key={ex.id} exercise={ex} state={state} setState={setState} />)}
        {list.length === 0 && !adding && state.exercises.length > 0 && <p className="text-[14px] text-slate py-2">No exercises in this group yet.</p>}
        {list.length === 0 && !adding && state.exercises.length === 0 && <p className="text-[14px] text-slate py-2">No exercises yet — add your routine below.</p>}
        {adding ? (
          <AddExerciseForm
            defaultRest={state.settings.defaultRestSeconds}
            onCancel={() => setAdding(false)}
            onAdd={(ex) => { setState((s) => ({ ...s, exercises: [...s.exercises, ex] })); setAdding(false) }}
          />
        ) : (
          <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 text-slate py-3.5 text-[14px] font-medium">
            {Icon.plus('w-4 h-4')} Add exercise
          </button>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   PROGRESS — segregated by muscle group + a single exercise selector.
   No more "everything dumped at once"; you pick what you want to see.
   ========================================================================= */

function ProgressScreen({ state }) {
  const groupsPresent = ['All', ...MUSCLE_GROUPS.filter((g) => state.exercises.some((e) => e.muscleGroup === g))]
  const [group, setGroup] = useState('All')
  const filtered = group === 'All' ? state.exercises : state.exercises.filter((e) => e.muscleGroup === group)
  const [selected, setSelected] = useState(filtered[0]?.id || null)
  const [panel, setPanel] = useState(null) // null | 'pr' | 'history'

  useEffect(() => {
    if (!filtered.some((e) => e.id === selected)) setSelected(filtered[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group])

  const exercise = state.exercises.find((e) => e.id === selected)
  const logsAsc = state.workoutLogs.filter((l) => l.exerciseId === selected).sort((a, b) => new Date(a.date) - new Date(b.date))
  const chartData = logsAsc.map((l) => ({ date: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), topSet: Math.max(...l.sets.map((s) => s.weight)) }))
  const bestWeight = logsAsc.length ? Math.max(...logsAsc.flatMap((l) => l.sets.map((s) => s.weight))) : null
  const bestVolume = logsAsc.length ? Math.max(...logsAsc.map((l) => l.sets.reduce((s, set) => s + set.weight * set.reps, 0))) : null

  // PR timeline for THIS exercise only — only sessions where a new best was set
  let runningBest = 0
  const prEvents = []
  logsAsc.forEach((l) => {
    const top = Math.max(...l.sets.map((s) => s.weight))
    if (top > runningBest) { prEvents.push({ date: l.date, weight: top }); runningBest = top }
  })

  // Sub-panels — PR timeline and full history collapsed behind entry points,
  // same pattern as Body/Measurements, so the main Progress view stays short.
  if (panel === 'pr' && exercise) {
    return (
      <div className="pb-4">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setPanel(null)} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
          <h1 className="font-display text-[19px] font-semibold">PR timeline — {exercise.name}</h1>
        </div>
        <div className="px-5">
          <Card>
            {prEvents.length === 0 ? <p className="text-[13px] text-slate">No PRs yet for this exercise.</p> : (
              <div className="max-h-[70vh] overflow-y-auto space-y-2.5">
                {[...prEvents].reverse().map((p, i) => (
                  <div key={i} className="flex justify-between text-[14px] border-b border-white/5 pb-2.5">
                    <span className="text-signal font-semibold">🔥 {p.weight}kg</span>
                    <span className="text-slate">{p.date}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }
  if (panel === 'history' && exercise) {
    return (
      <div className="pb-4">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setPanel(null)} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
          <h1 className="font-display text-[19px] font-semibold">Full history — {exercise.name}</h1>
        </div>
        <div className="px-5">
          <Card>
            <div className="max-h-[70vh] overflow-y-auto space-y-2.5">
              {[...logsAsc].reverse().map((l) => (
                <div key={l.id} className="flex justify-between border-b border-white/5 pb-2.5">
                  <span className="text-[14px]">{l.sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')}</span>
                  <span className="text-[12px] text-slate shrink-0 ml-2">{l.date}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <ScreenHeader title="Progress" subtitle="Pick an exercise to see its history" />
      <div className="px-5 space-y-4">
        {state.exercises.length === 0 ? (
          <p className="text-[14px] text-slate">Add exercises in Workout to start seeing progress here.</p>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {groupsPresent.map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {filtered.map((e) => <Chip key={e.id} active={selected === e.id} onClick={() => setSelected(e.id)}>{e.name}</Chip>)}
            </div>

            {!exercise ? (
              <p className="text-[14px] text-slate">No exercises in this muscle group yet.</p>
            ) : logsAsc.length === 0 ? (
              <p className="text-[14px] text-slate">No sets logged for {exercise.name} yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock label="Best weight" value={bestWeight} unit="kg" />
                  <StatBlock label="Best volume" value={bestVolume?.toLocaleString()} unit="kg" />
                </div>

                {chartData.length > 1 && (
                  <Card className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="topSet" stroke="#FF6A3D" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                <button onClick={() => setPanel('pr')} className="w-full flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{Icon.flag('w-5 h-5 text-signal')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">PR timeline</p>
                    <p className="text-[12px] text-slate">{prEvents.length > 0 ? `${prEvents.length} PR${prEvents.length > 1 ? 's' : ''} — best ${bestWeight}kg` : 'No PRs yet'}</p>
                  </div>
                  {Icon.chevron('w-4 h-4 text-slate shrink-0')}
                </button>

                <button onClick={() => setPanel('history')} className="w-full flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{Icon.chart('w-5 h-5 text-signal')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">Full history</p>
                    <p className="text-[12px] text-slate">{logsAsc.length} session{logsAsc.length > 1 ? 's' : ''} logged</p>
                  </div>
                  {Icon.chevron('w-4 h-4 text-slate shrink-0')}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   MORE — a menu that opens sub-screens (Body, Skip log, Analytics, Settings).
   Keeps the bottom nav to 4 tabs, which is what makes an app feel like an
   app instead of a dashboard crammed onto a phone.
   ========================================================================= */

function MeasurementsPanel({ state, setState, onBack }) {
  const measurementUnit = state.settings.measurementUnit
  const [mType, setMType] = useState(MEASURE_TYPES[0])
  const [mValue, setMValue] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [showHistory, setShowHistory] = useState(false)

  const setMeasurementUnit = (u) => setState((s) => ({ ...s, settings: { ...s.settings, measurementUnit: u } }))

  const logMeasurement = () => {
    const raw = parseFloat(mValue); if (!raw) return
    const cmVal = measurementUnit === 'in' ? inToCm(raw) : raw
    const now = new Date()
    setState((s) => ({ ...s, measurementLogs: [{ id: uid(), date: now.toDateString(), time: now.toISOString(), type: mType, valueCm: cmVal }, ...s.measurementLogs] }))
    setMValue('')
  }
  const deleteMeasurement = (id) => setState((s) => ({ ...s, measurementLogs: s.measurementLogs.filter((m) => m.id !== id) }))

  const measurementLogs = [...state.measurementLogs].sort((a, b) => new Date(b.time || b.date) - new Date(a.time || a.date))
  const typesLogged = MEASURE_TYPES.filter((t) => measurementLogs.some((m) => m.type === t))
  const filteredLogs = filterType === 'All' ? measurementLogs : measurementLogs.filter((m) => m.type === filterType)
  const latestByType = MEASURE_TYPES.map((t) => {
    const rows = measurementLogs.filter((m) => m.type === t)
    const first = [...rows].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date))[0]
    const latestM = rows[0]
    const change = latestM && first && latestM.id !== first.id ? latestM.valueCm - first.valueCm : null
    return { type: t, latest: latestM, change }
  }).filter((r) => r.latest)

  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(false)} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
          <p className="font-display text-[17px] font-semibold flex-1">Measurement history</p>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-ink border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-signal">
            <option value="All">All types</option>
            {typesLogged.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Card>
          <div className="max-h-[70vh] overflow-y-auto">
            {filteredLogs.length === 0 ? <p className="text-[13px] text-slate">No entries yet.</p> : filteredLogs.map((m) => (
              <div key={m.id} className="flex justify-between items-center border-b border-white/5 py-2.5">
                <div>
                  <p className="text-[14px]">{m.type} — <span className="tabular-nums">{fmtL(m.valueCm, measurementUnit)}{measurementUnit}</span></p>
                  <p className="text-[11px] text-slate">{new Date(m.time || m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <button onClick={() => deleteMeasurement(m.id)}>{Icon.trash('w-3.5 h-3.5 text-slate')}</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
        <p className="font-display text-[17px] font-semibold flex-1">Measurements</p>
        <div className="flex rounded-lg border border-white/10 overflow-hidden text-[11px] font-medium">
          <button onClick={() => setMeasurementUnit('cm')} className={`px-2.5 py-1 ${measurementUnit === 'cm' ? 'bg-signal text-ink' : 'text-slate'}`}>Cm</button>
          <button onClick={() => setMeasurementUnit('in')} className={`px-2.5 py-1 ${measurementUnit === 'in' ? 'bg-signal text-ink' : 'text-slate'}`}>In</button>
        </div>
      </div>

      <Card className="space-y-2.5">
        <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full bg-ink border border-white/10 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-signal">
          {MEASURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-2">
          <TextField value={mValue} onChange={(e) => setMValue(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder={measurementUnit} />
          <button onClick={logMeasurement} className={`${btnPrimary} rounded-xl px-4 text-[14px] shrink-0`}>Log</button>
        </div>
      </Card>

      {latestByType.length > 0 && (
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-slate mb-2 font-medium">Current &amp; change</p>
          {latestByType.map((r) => (
            <div key={r.type} className="flex justify-between border-b border-white/5 py-1.5">
              <span className="text-[13px]">{r.type}</span>
              <span className="tabular-nums text-[13px]">
                {fmtL(r.latest.valueCm, measurementUnit)}{measurementUnit}{' '}
                {r.change !== null && <span className={`text-[11px] ml-1 ${r.change < 0 ? 'text-moss' : r.change > 0 ? 'text-signal' : 'text-slate'}`}>({r.change > 0 ? '+' : ''}{fmtL(Math.abs(r.change), measurementUnit)})</span>}
              </span>
            </div>
          ))}
        </Card>
      )}

      <button onClick={() => setShowHistory(true)} className="w-full flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{Icon.chart('w-5 h-5 text-signal')}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium">History</p>
          <p className="text-[12px] text-slate">{measurementLogs.length > 0 ? `${measurementLogs.length} entries` : 'No entries yet'}</p>
        </div>
        {Icon.chevron('w-4 h-4 text-slate shrink-0')}
      </button>
    </div>
  )
}

function WeightHistoryPanel({ state, setState, onBack }) {
  const weightUnit = state.settings.weightUnit
  const sorted = [...state.bodyLogs].sort((a, b) => new Date(b.time || b.date) - new Date(a.time || a.date))
  const deleteBodyLog = (id) => setState((s) => ({ ...s, bodyLogs: s.bodyLogs.filter((l) => l.id !== id) }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
        <p className="font-display text-[17px] font-semibold flex-1">Weigh-in history</p>
      </div>
      <Card>
        <div className="max-h-[70vh] overflow-y-auto space-y-0.5">
          {sorted.length === 0 ? <p className="text-[13px] text-slate">No entries yet.</p> : sorted.map((l) => (
            <div key={l.id} className="flex justify-between items-center border-b border-white/5 py-2.5">
              <div>
                <p className="text-[14px] tabular-nums">{fmtW(l.weightKg, weightUnit)} {weightUnit}</p>
                <p className="text-[11px] text-slate">{new Date(l.time || l.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => deleteBodyLog(l.id)}>{Icon.trash('w-3.5 h-3.5 text-slate')}</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function BodySubscreen({ state, setState }) {
  const weightUnit = state.settings.weightUnit
  const [weight, setWeight] = useState('')
  const [panel, setPanel] = useState(null) // null | 'measurements' | 'weightHistory'

  const setWeightUnit = (u) => setState((s) => ({ ...s, settings: { ...s.settings, weightUnit: u } }))

  const sorted = [...state.bodyLogs].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date))
  const byDay = {}
  sorted.forEach((l) => { byDay[l.date] = byDay[l.date] || []; byDay[l.date].push(l.weightKg) })
  const dailyAverages = Object.entries(byDay).map(([date, vals]) => ({ date, avgKg: vals.reduce((a, b) => a + b, 0) / vals.length }))
  const last7 = dailyAverages.slice(-7)
  const avg7 = last7.length ? last7.reduce((s, d) => s + d.avgKg, 0) / last7.length : null
  const latest = sorted[sorted.length - 1]
  const first = sorted[0]
  // total change since the first ever weigh-in — mirrors how measurement change is shown
  const weightChange = latest && first && latest.id !== first.id ? latest.weightKg - first.weightKg : null
  const chartData = dailyAverages.slice(-30).map((d) => ({ date: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), weight: weightUnit === 'lb' ? kgToLb(d.avgKg) : d.avgKg }))

  const logWeight = () => {
    const raw = parseFloat(weight); if (!raw) return
    const kg = weightUnit === 'lb' ? lbToKg(raw) : raw
    const now = new Date()
    setState((s) => ({ ...s, bodyLogs: [...s.bodyLogs, { id: uid(), date: now.toDateString(), time: now.toISOString(), weightKg: kg }] }))
    setWeight('')
  }

  const measurementCount = state.measurementLogs.length
  const measurementTypesLogged = new Set(state.measurementLogs.map((m) => m.type)).size

  if (panel === 'measurements') return <MeasurementsPanel state={state} setState={setState} onBack={() => setPanel(null)} />
  if (panel === 'weightHistory') return <WeightHistoryPanel state={state} setState={setState} onBack={() => setPanel(null)} />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-display text-[15px] font-semibold">Weight</p>
        <div className="flex rounded-lg border border-white/10 overflow-hidden text-[11px] font-medium">
          <button onClick={() => setWeightUnit('kg')} className={`px-2.5 py-1 ${weightUnit === 'kg' ? 'bg-signal text-ink' : 'text-slate'}`}>Kg</button>
          <button onClick={() => setWeightUnit('lb')} className={`px-2.5 py-1 ${weightUnit === 'lb' ? 'bg-signal text-ink' : 'text-slate'}`}>Lb</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBlock
          label="Latest"
          value={latest ? fmtW(latest.weightKg, weightUnit) : '—'}
          unit={latest ? weightUnit : ''}
          delta={weightChange !== null ? { good: weightChange < 0, text: `${weightChange > 0 ? '+' : ''}${fmtW(weightChange, weightUnit)}${weightUnit} since first log` } : null}
        />
        <StatBlock label="7-day avg" value={avg7 !== null ? fmtW(avg7, weightUnit) : '—'} unit={avg7 !== null ? weightUnit : ''} />
      </div>

      {chartData.length > 1 && (
        <Card className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#8890A0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v.toFixed(1)} ${weightUnit}`, 'weight']} />
              <Line type="monotone" dataKey="weight" stroke="#3D8361" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="flex gap-2 items-end">
        <div className="flex-1">
          <p className="text-[11px] text-slate mb-1.5">Log a weigh-in</p>
          <TextField value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal" step="0.1" placeholder={weightUnit} />
        </div>
        <button onClick={logWeight} className={`${btnPrimary} rounded-xl px-4 py-3 text-[14px]`}>Log</button>
      </Card>

      {/* Both history sections collapsed behind single entry points — tap to open,
          instead of permanently eating vertical space on the main Body screen. */}
      <button onClick={() => setPanel('weightHistory')} className="w-full flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{Icon.scale('w-5 h-5 text-signal')}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium">Weigh-in history</p>
          <p className="text-[12px] text-slate">{sorted.length > 0 ? `${sorted.length} entries logged` : 'No entries yet'}</p>
        </div>
        {Icon.chevron('w-4 h-4 text-slate shrink-0')}
      </button>

      <button onClick={() => setPanel('measurements')} className="w-full flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-inkraise to-[#171F2A] border border-white/[0.07] shadow-lg shadow-black/20 p-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{Icon.flag('w-5 h-5 text-signal')}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium">Measurements</p>
          <p className="text-[12px] text-slate">{measurementCount > 0 ? `${measurementTypesLogged} tracked · ${measurementCount} entries` : 'Chest, shoulders, back, arms, waist, legs & more'}</p>
        </div>
        {Icon.chevron('w-4 h-4 text-slate shrink-0')}
      </button>
    </div>
  )
}

function SkipLogSubscreen({ state, setState }) {
  const [reason, setReason] = useState(SKIP_REASONS[0])
  const [note, setNote] = useState('')
  const todayStr = new Date().toDateString()
  const alreadyTrainedToday = state.workoutLogs.some((l) => l.date === todayStr)
  const todaysSkip = state.skipLogs.find((s) => s.date === todayStr)

  const thisMonth = state.skipLogs.filter((s) => daysAgo(s.date) <= 30)
  const counts = thisMonth.reduce((a, s) => { a[s.reason] = (a[s.reason] || 0) + 1; return a }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

  const logSkip = () => {
    // one entry per calendar day — logging again today replaces today's entry, never duplicates
    setState((s) => ({
      ...s,
      skipLogs: [{ id: uid(), date: todayStr, reason, note }, ...s.skipLogs.filter((x) => x.date !== todayStr)],
      streak: { ...s.streak, current: 0 },
    }))
    setNote('')
  }
  const removeTodaysSkip = () => setState((s) => ({ ...s, skipLogs: s.skipLogs.filter((x) => x.date !== todayStr) }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="This month" value={thisMonth.length} unit="skips" />
        <StatBlock label="Top reason" value={top ? top[0] : '—'} accent="#FF6A3D" />
      </div>

      <Card className="space-y-3">
        {alreadyTrainedToday ? (
          <p className="text-[13px] text-slate">You already logged a workout today — no need to log a skip too.</p>
        ) : todaysSkip ? (
          <div className="flex items-center justify-between">
            <p className="text-[13px]">Today logged as skipped — <span className="text-signal font-medium">{todaysSkip.reason}</span></p>
            <button onClick={removeTodaysSkip} className="text-[12px] text-slate underline">Undo</button>
          </div>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-wide text-slate font-medium">Log today as skipped</p>
            <div className="flex flex-wrap gap-1.5">
              {SKIP_REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}
            </div>
            <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
            <button onClick={logSkip} className="rounded-xl bg-signal text-ink px-4 py-2.5 text-[14px] font-semibold">Log skip</button>
          </>
        )}
      </Card>

      {thisMonth.length >= 4 && (
        <Card className="border-signal/40 bg-signal/[0.08]">
          <p className="text-[13px] font-medium text-signal">
            {top?.[0] === 'Sick' ? 'A few sick days this month — recovery matters more than the streak.' : `${thisMonth.length} skipped days this month, mostly "${top?.[0].toLowerCase()}". Might be worth shrinking the plan.`}
          </p>
        </Card>
      )}

      <Card>
        <p className="text-[11px] uppercase tracking-wide text-slate mb-2 font-medium">Recent</p>
        {state.skipLogs.slice(0, 10).map((s) => (
          <div key={s.id} className="flex justify-between border-b border-white/5 py-2">
            <div><p className="text-[13px]">{s.reason}</p>{s.note && <p className="text-[11px] text-slate">{s.note}</p>}</div>
            <p className="text-[11px] text-slate">{s.date}</p>
          </div>
        ))}
        {state.skipLogs.length === 0 && <p className="text-[13px] text-slate">No skips logged. Good.</p>}
      </Card>
    </div>
  )
}

function AnalyticsSubscreen({ state }) {
  const workoutDates = new Set(state.workoutLogs.map((l) => l.date))
  const skipDates = new Set(state.skipLogs.map((s) => s.date))
  const totalWorkoutDays = workoutDates.size
  const totalSets = state.workoutLogs.reduce((s, l) => s + l.sets.length, 0)
  const totalVolume = state.workoutLogs.reduce((s, l) => s + l.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0)
  const last30Workout = [...workoutDates].filter((d) => daysAgo(d) <= 29).length
  const last30Skip = [...skipDates].filter((d) => daysAgo(d) <= 29).length
  const consistency = last30Workout + last30Skip > 0 ? Math.round((last30Workout / (last30Workout + last30Skip)) * 100) : null

  const weekLabel = (w) => { const d = new Date(); d.setDate(d.getDate() - w * 7); return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) }
  const weeklyVolume = []
  for (let w = 7; w >= 0; w--) {
    const start = w * 7, end = start + 6
    const vol = state.workoutLogs.filter((l) => daysAgo(l.date) >= start && daysAgo(l.date) <= end).reduce((s, l) => s + l.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0)
    weeklyVolume.push({ week: weekLabel(w), volume: vol })
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const heatDays = []
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toDateString()
    heatDays.push({ date: d, status: workoutDates.has(key) ? 'workout' : skipDates.has(key) ? 'skip' : 'none' })
  }
  const cols = []
  for (let i = 0; i < heatDays.length; i += 7) cols.push(heatDays.slice(i, i + 7))
  const colorFor = (s) => (s === 'workout' ? '#FF6A3D' : s === 'skip' ? '#3A3040' : '#232D3B')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Workout days" value={totalWorkoutDays} />
        <StatBlock label="Total sets" value={totalSets} />
        <StatBlock label="Total volume" value={totalVolume.toLocaleString()} unit="kg" />
        <StatBlock label="Longest streak" value={state.streak.longest} unit="days" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <p className="text-[11px] uppercase tracking-wide text-slate font-medium">Last 8 weeks</p>
          {consistency !== null && <p className="text-[13px]"><span className="text-signal font-semibold">{consistency}%</span> <span className="text-slate">consistency</span></p>}
        </div>
        <div className="flex gap-1">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((d, di) => <div key={di} style={{ background: colorFor(d.status) }} className="w-3 h-3 rounded-[2px]" />)}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2.5 text-[10px] text-slate">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-signal inline-block" />Trained</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#3A3040] inline-block" />Skipped</span>
        </div>
      </Card>

      <Card>
        <p className="text-[11px] uppercase tracking-wide text-slate mb-2 font-medium">Weekly volume</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolume} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: '#8890A0', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8890A0', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1B2431', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v.toLocaleString()}kg`, 'volume']} />
              <Bar dataKey="volume" fill="#FF6A3D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function SettingsSubscreen({ state, setState }) {
  const s = state.settings
  const [weeklyGoal, setWeeklyGoal] = useState(s.weeklyGoal)
  const [plateauDays, setPlateauDays] = useState(s.plateauDays)
  const [defaultRest, setDefaultRest] = useState(s.defaultRestSeconds)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const save = () => {
    setState((st) => ({ ...st, settings: { ...st.settings, weeklyGoal: +weeklyGoal || 5, plateauDays: +plateauDays || 60, defaultRestSeconds: +defaultRest || 90 } }))
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  const deleteExercise = (id) => setState((st) => ({ ...st, exercises: st.exercises.filter((e) => e.id !== id), workoutLogs: st.workoutLogs.filter((l) => l.exerciseId !== id) }))
  const resetAll = () => { if (window.confirm('This clears everything. This cannot be undone. Continue?')) setState(() => structuredClone(DEFAULT_STATE)) }

  const exportData = () => {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dear-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
    setMsg('Downloaded.'); setTimeout(() => setMsg(''), 2000)
  }

  // Human-readable export for Excel/Google Sheets — separate from the JSON
  // backup above, which is machine-readable and used for Import.
  const exportCSV = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const rows = []

    rows.push(['WORKOUT LOG'])
    rows.push(['Date', 'Exercise', 'Muscle Group', 'Set #', 'Weight (kg)', 'Reps', 'Volume (kg)'])
    ;[...state.workoutLogs].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((l) => {
      const ex = state.exercises.find((e) => e.id === l.exerciseId)
      l.sets.forEach((s, i) => {
        rows.push([l.date, ex ? ex.name : 'Deleted exercise', ex ? ex.muscleGroup : '', i + 1, s.weight, s.reps, s.weight * s.reps])
      })
    })

    rows.push([])
    rows.push(['BODY WEIGHT'])
    rows.push(['Date', 'Time', 'Weight (kg)'])
    ;[...state.bodyLogs].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date)).forEach((l) => {
      rows.push([l.date, l.time ? new Date(l.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '', l.weightKg.toFixed(1)])
    })

    rows.push([])
    rows.push(['MEASUREMENTS'])
    rows.push(['Date', 'Type', 'Value (cm)'])
    ;[...state.measurementLogs].sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date)).forEach((m) => {
      rows.push([m.date, m.type, m.valueCm.toFixed(1)])
    })

    rows.push([])
    rows.push(['SKIP LOG'])
    rows.push(['Date', 'Reason', 'Note'])
    ;[...state.skipLogs].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((s) => {
      rows.push([s.date, s.reason, s.note || ''])
    })

    const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM so Excel reads UTF-8 correctly
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dear-fitness-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    setMsg('Downloaded.'); setTimeout(() => setMsg(''), 2000)
  }
  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { setState((s2) => ({ ...s2, ...JSON.parse(reader.result) })); setMsg('Imported.') }
      catch { setMsg('Invalid file.') }
      setTimeout(() => setMsg(''), 2000)
    }
    reader.readAsText(file); e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3.5">
        <p className="text-[11px] uppercase tracking-wide text-slate font-medium">Training targets</p>
        <div className="flex justify-between items-center">
          <p className="text-[14px]">Weekly workout goal</p>
          <input type="number" min="1" max="7" value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} className="w-16 bg-ink border border-white/10 rounded-lg px-2 py-2 text-[14px] text-center outline-none focus:border-signal" />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[14px]">Plateau threshold (days)</p>
          <input type="number" min="7" value={plateauDays} onChange={(e) => setPlateauDays(e.target.value)} className="w-16 bg-ink border border-white/10 rounded-lg px-2 py-2 text-[14px] text-center outline-none focus:border-signal" />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[14px]">Default rest (sec)</p>
          <input type="number" min="15" step="5" value={defaultRest} onChange={(e) => setDefaultRest(e.target.value)} className="w-16 bg-ink border border-white/10 rounded-lg px-2 py-2 text-[14px] text-center outline-none focus:border-signal" />
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <button onClick={save} className="rounded-xl bg-signal text-ink px-4 py-2.5 text-[14px] font-semibold">Save</button>
          {saved && <span className="text-[12px] text-moss">Saved.</span>}
        </div>
      </Card>

      <Card>
        <p className="text-[11px] uppercase tracking-wide text-slate mb-2 font-medium">Backup</p>
        <div className="flex gap-2">
          <button onClick={exportData} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-[13px] font-medium text-slate">{Icon.download('w-4 h-4')} Backup (.json)</button>
          <button onClick={() => fileRef.current.click()} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-[13px] font-medium text-slate">{Icon.upload('w-4 h-4')} Import</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
        </div>
        <button onClick={exportCSV} className={`w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium ${btnPrimary}`}>{Icon.download('w-4 h-4')} Export for Excel (.csv)</button>
        <p className="text-[11px] text-slate mt-2">Backup (.json) is for restoring your data in this app via Import. Excel export (.csv) is for viewing/analyzing in Excel or Google Sheets — it can't be imported back.</p>
        {msg && <p className="text-[11px] text-moss text-center mt-2">{msg}</p>}
      </Card>

      {state.exercises.length > 0 && (
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-slate mb-2 font-medium">Manage exercises</p>
          {state.exercises.map((ex) => (
            <div key={ex.id} className="flex justify-between items-center border-b border-white/5 py-2.5">
              <div>
                <p className="text-[13px]">{ex.name}</p>
                <p className="text-[11px] text-slate">{ex.muscleGroup} · {ex.restSeconds}s rest</p>
              </div>
              <button onClick={() => deleteExercise(ex.id)}>{Icon.trash('w-3.5 h-3.5 text-slate')}</button>
            </div>
          ))}
        </Card>
      )}

      <Card className="border-signal/30">
        <p className="text-[11px] uppercase tracking-wide text-signal font-medium">Danger zone</p>
        <p className="text-[12px] text-slate mt-2 mb-3">Wipes all local data on this device. Export a backup first.</p>
        <button onClick={resetAll} className="rounded-xl border border-signal/40 text-signal px-4 py-2.5 text-[13px] font-semibold">Reset all data</button>
      </Card>
    </div>
  )
}

function MoreScreen({ state, setState }) {
  const [view, setView] = useState(null) // null | 'body' | 'skips' | 'analytics' | 'settings'

  const MENU = [
    { id: 'body', label: 'Body', sub: 'Weight & measurements', icon: Icon.scale },
    { id: 'skips', label: 'Skip log', sub: 'Track why you missed a day', icon: Icon.bed },
    { id: 'analytics', label: 'Analytics', sub: 'Consistency, volume, history', icon: Icon.chart },
    { id: 'settings', label: 'Settings', sub: 'Goals, backup, exercises', icon: Icon.gear },
  ]

  if (view) {
    const active = MENU.find((m) => m.id === view)
    return (
      <div className="pb-4">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setView(null)} className="p-1 -ml-1">{Icon.back('w-5 h-5')}</button>
          <h1 className="font-display text-[19px] font-semibold">{active.label}</h1>
        </div>
        <div className="px-5">
          {view === 'body' && <BodySubscreen state={state} setState={setState} />}
          {view === 'skips' && <SkipLogSubscreen state={state} setState={setState} />}
          {view === 'analytics' && <AnalyticsSubscreen state={state} />}
          {view === 'settings' && <SettingsSubscreen state={state} setState={setState} />}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <ScreenHeader title="More" />
      <div className="px-5 space-y-2.5">
        {MENU.map((m) => (
          <button key={m.id} onClick={() => setView(m.id)} className="w-full flex items-center gap-3.5 rounded-2xl bg-inkraise border border-white/[0.06] p-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">{m.icon('w-5 h-5 text-signal')}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">{m.label}</p>
              <p className="text-[12px] text-slate">{m.sub}</p>
            </div>
            {Icon.chevron('w-4 h-4 text-slate shrink-0')}
          </button>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   APP SHELL — mobile-first, bottom tab bar, 4 tabs. Everything above is
   composed here. Max width caps it so it also looks right on desktop
   browsers without turning into a sidebar dashboard.
   ========================================================================= */

const TABS = [
  { id: 'home', label: 'Home', icon: Icon.home },
  { id: 'workout', label: 'Workout', icon: Icon.dumbbell },
  { id: 'progress', label: 'Progress', icon: Icon.chart },
  { id: 'more', label: 'More', icon: Icon.menu },
]

export default function App() {
  const [state, setState] = useAppState()
  const [tab, setTab] = useState('home')

  return (
    <div className="min-h-screen text-chalk" style={{ background: 'radial-gradient(circle at 50% 0%, #1a2432 0%, #131B26 55%)' }}>
      <div className="max-w-md mx-auto min-h-screen relative pb-20">
        {tab === 'home' && <HomeScreen state={state} goTo={setTab} />}
        {tab === 'workout' && <WorkoutScreen state={state} setState={setState} />}
        {tab === 'progress' && <ProgressScreen state={state} />}
        {tab === 'more' && <MoreScreen state={state} setState={setState} />}
      </div>

      <nav className="fixed bottom-0 inset-x-0 border-t border-white/[0.06] bg-ink/90 backdrop-blur-xl z-30">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="relative flex flex-col items-center gap-1 py-2.5">
              {tab === t.id && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-signal" />}
              {t.icon(`w-5 h-5 transition-colors ${tab === t.id ? 'text-signal' : 'text-slate'}`)}
              <span className={`text-[10px] font-medium transition-colors ${tab === t.id ? 'text-signal' : 'text-slate'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
