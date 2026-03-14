/**
 * Get relative time string from a timestamp
 * @param {Date|string} timestamp - The timestamp to format
 * @returns {string} Relative time string (e.g., "just now", "2 minutes ago")
 */
export function getRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
}

/**
 * Format timestamp as human-readable date string
 * @param {Date|string} timestamp - The timestamp to format
 * @returns {string} Formatted date string (e.g., "January 15, 2024 at 3:45 PM")
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return date.toLocaleString('en-US', options);
}
