/**
 * Skeleton loading components for admin panel.
 * Provides animated pulse placeholders for content loading states.
 */

/**
 * Base skeleton bar with configurable dimensions via className.
 */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse bg-site-soft rounded ${className}`} />
}

/**
 * Card shell with configurable number of skeleton lines.
 */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/**
 * Table shell with configurable rows and columns.
 */
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
      {/* Header row */}
      <div className="flex gap-4 p-4 border-b border-site-border">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }, (_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 p-4 border-b border-site-border last:border-b-0"
        >
          {Array.from({ length: columns }, (_, colIdx) => (
            <Skeleton key={colIdx} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
