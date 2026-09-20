export default function Topbar({ title, subtitle }) {
  const today = new Date()
  return (
    <div className="flex items-end justify-between px-8 pt-7 pb-5 border-b border-white/10">
      <div>
        <p className="text-sm text-slate">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="font-display text-[26px] font-semibold mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-slate mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
