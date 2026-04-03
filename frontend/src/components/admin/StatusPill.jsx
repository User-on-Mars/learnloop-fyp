export default function StatusPill({ status, label }) {
  const statusStyles = {
    active: 'bg-green-50 text-green-700 border border-green-200',
    suspended: 'bg-amber-50 text-amber-700 border border-amber-200',
    banned: 'bg-red-50 text-red-700 border border-red-200',
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    dismissed: 'bg-gray-50 text-gray-700 border border-gray-200',
    actioned: 'bg-green-50 text-green-700 border border-green-200',
    low: 'bg-blue-50 text-blue-700 border border-blue-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    high: 'bg-red-50 text-red-700 border border-red-200',
    user: 'bg-blue-50 text-blue-700 border border-blue-200',
    admin: 'bg-purple-50 text-purple-700 border border-purple-200'
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.active}`}>
      {label || status}
    </span>
  )
}
