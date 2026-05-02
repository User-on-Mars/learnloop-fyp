/**
 * PublishStatusBadge - Visual indicator for skillmap publish status
 */
export function PublishStatusBadge({ status }) {
  const badges = {
    draft: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-600 border-gray-300'
    },
    pending: {
      label: 'Under Review',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    published: {
      label: 'Published',
      className: 'bg-site-accent-soft text-site-accent border-site-accent-border'
    },
    rejected: {
      label: 'Not Approved',
      className: 'bg-red-50 text-red-700 border-red-200'
    }
  };

  const badge = badges[status] || badges.draft;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
      {badge.label}
    </span>
  );
}
