export default function MetricCard({ icon: Icon, label, value, sub, trend, trendColor, iconBg = 'bg-site-soft', iconColor = 'text-site-accent' }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-sm text-site-muted font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-site-ink">{value}</p>
      {sub && <p className="text-xs text-site-faint mt-1">{sub}</p>}
      {trend && <p className={`text-xs mt-1 ${trendColor || 'text-site-muted'}`}>{trend}</p>}
    </div>
  )
}
