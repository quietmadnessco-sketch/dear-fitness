export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-inkraise border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, unit, accent }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className={`font-display text-[28px] font-semibold mt-2 tabular ${accent ? '' : ''}`} style={accent ? { color: accent } : undefined}>
        {value} {unit && <span className="text-sm text-slate font-medium">{unit}</span>}
      </p>
    </Card>
  )
}
