import { useRef, useState } from 'react'

const ITEMS = [
  { id: 'home', label: 'Overview', icon: '⌂' },
  { id: 'workout', label: 'Workout', icon: '▲' },
  { id: 'progress', label: 'Progress', icon: '↗' },
  { id: 'analytics', label: 'Analytics', icon: '▦' },
  { id: 'body', label: 'Body', icon: '◍' },
  { id: 'skips', label: 'Skip log', icon: '◐' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ active, onChange, state, setState }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const exportData = () => {
    const json = JSON.stringify(state, null, 2)
    const filename = `dear-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Downloaded.')
    setTimeout(() => setMsg(''), 2500)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        setState((s) => ({ ...s, ...parsed }))
        setMsg('Imported.')
      } catch {
        setMsg('Invalid file.')
      }
      setTimeout(() => setMsg(''), 2500)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <aside className="w-[220px] shrink-0 border-r border-white/10 bg-[#161D28] min-h-screen p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center text-ink font-bold">DF</div>
        <p className="font-display text-base font-semibold">Dear Fitness</p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
              active === it.id ? 'bg-signal/10 text-signal' : 'text-slate hover:text-chalk'
            }`}
          >
            <span className="w-[18px] text-center">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="rounded-xl bg-inkraise border border-white/10 p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-slate">Streak</p>
          <p className="font-display text-xl mt-1 tabular text-signal">{state.streak.current} days</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportData} className="flex-1 text-[11px] font-medium rounded-lg border border-white/10 text-slate py-2">
            Export data
          </button>
          <button onClick={() => fileRef.current.click()} className="flex-1 text-[11px] font-medium rounded-lg border border-white/10 text-slate py-2">
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
        </div>
        {msg && <p className="text-[11px] text-moss text-center">{msg}</p>}
      </div>
    </aside>
  )
}
