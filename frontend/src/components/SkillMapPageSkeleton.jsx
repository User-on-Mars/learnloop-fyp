export default function SkillMapPageSkeleton() {
  const pulse = 'skill-map-skeleton-pulse rounded-md bg-gray-200';
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4" data-testid="skeleton-ui">
      <div className="max-w-4xl mx-auto">
        <div className={`h-10 w-28 mb-6 ${pulse}`} />

        <div className="flex items-start gap-3 mb-6">
          <div className={`h-12 w-12 shrink-0 ${pulse}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-8 w-full max-w-md ${pulse}`} />
            <div className={`h-4 w-full max-w-sm ${pulse}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className={`h-4 w-full mb-3 ${pulse}`} />
          <div className={`h-3 w-full rounded-full ${pulse}`} />
        </div>

        <div className="flex items-center justify-center gap-2 py-6 overflow-x-auto">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-10 w-10 shrink-0 rounded-full ${pulse}`} data-testid="skeleton-node-circle" />
              {i < 4 && <div className={`h-1 w-8 sm:w-12 shrink-0 ${pulse}`} />}
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <div className={`h-6 w-40 ${pulse}`} />
          <div className={`h-32 w-full max-w-xl mx-auto ${pulse}`} />
        </div>
      </div>
    </div>
  );
}
