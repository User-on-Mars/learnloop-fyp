/** Turns an ISO timestamp into a short relative phrase for lists. */
export function relativeDate(isoString: string): string {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const diffMs = now - then
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / dayMs)

  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}
