const MOODS = {
  'Happy': '😊',
  'Neutral': '😐',
  'Sad': '😢',
  'Energized': '⚡',
  'Thoughtful': '🤔'
};

function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

export function LivePreview({ content, mood, tags, lastUpdated }) {
  return (
    <div className="h-full flex flex-col bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Preview</h3>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {getRelativeTime(lastUpdated)}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {mood && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-4xl">{MOODS[mood]}</span>
            <span className="text-sm font-medium text-gray-600">{mood}</span>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-3 py-1.5 bg-ll-100 text-ll-800 rounded-full text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          {content ? (
            <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          ) : (
            <p className="text-gray-400 italic">
              Start typing to see your reflection preview...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
