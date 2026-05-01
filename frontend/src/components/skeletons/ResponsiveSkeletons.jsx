/**
 * Responsive Skeleton Components
 * 
 * Loading skeleton components that match responsive layout patterns.
 * These skeletons mirror the responsive behavior of actual components:
 * - HeroSectionSkeleton: Matches HeroSection component with stat grid
 * - DataTableSkeleton: Table on desktop, cards on mobile
 * - CardGridSkeleton: Responsive grid layout (1/2/3 columns)
 * 
 * All skeletons use Tailwind's animate-pulse utility and match breakpoint behavior:
 * - Mobile: <640px (base styles)
 * - Tablet: 640px-1023px (sm: prefix)
 * - Desktop: 1024px+ (lg: prefix)
 */

/**
 * HeroSectionSkeleton - Loading skeleton for hero sections
 * 
 * Matches HeroSection component responsive behavior:
 * - Vertical stack on mobile, horizontal on sm+
 * - 2-column stat grid on mobile, 4-column on tablet+
 * - Responsive padding: p-4 sm:p-6 lg:p-8
 * 
 * @param {Object} props
 * @param {string} props.statsColumns - Grid columns for stats (default: 'grid-cols-2 sm:grid-cols-4')
 * @param {number} props.statsCount - Number of stat cards to show (default: 4)
 * @param {boolean} props.showActions - Whether to show action button skeletons (default: true)
 */
export function HeroSectionSkeleton({ 
  statsColumns = 'grid-cols-2 sm:grid-cols-4',
  statsCount = 4,
  showActions = true 
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8">
      {/* Background decorative elements */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gray-200 opacity-15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-gray-200 opacity-10 blur-2xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
        {/* Left: Title + Description */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            {/* Icon skeleton */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200 animate-pulse" />
            <div className="flex-1">
              {/* Title skeleton */}
              <div className="h-6 sm:h-7 lg:h-8 bg-gray-200 rounded animate-pulse w-48 mb-1.5" />
              {/* Subtitle skeleton */}
              <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse w-32" />
            </div>
          </div>
          {/* Description skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-xl" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 max-w-md" />
          </div>
        </div>

        {/* Right: Action Buttons */}
        {showActions && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            <div className="h-10 sm:h-11 bg-gray-200 rounded-xl animate-pulse w-full sm:w-32" />
            <div className="h-10 sm:h-11 bg-gray-200 rounded-xl animate-pulse w-full sm:w-32" />
          </div>
        )}
      </div>

      {/* Stat Grid */}
      <div className={`relative grid ${statsColumns} gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200`}>
        {Array.from({ length: statsCount }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            {/* Stat icon skeleton */}
            <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {/* Stat value skeleton */}
              <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-16 mb-1" />
              {/* Stat label skeleton */}
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * DataTableSkeleton - Loading skeleton for data tables
 * 
 * Matches DataTable component responsive behavior:
 * - Desktop: Grid-based table with header and rows
 * - Mobile: Card-based layout
 * - Minimum 44px height for tap targets
 * 
 * @param {Object} props
 * @param {number} props.rows - Number of rows/cards to show (default: 5)
 * @param {number} props.columns - Number of columns for desktop table (default: 5)
 * @param {boolean} props.showHeader - Whether to show table header on desktop (default: true)
 */
export function DataTableSkeleton({ 
  rows = 5, 
  columns = 5,
  showHeader = true 
}) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        {/* Table Header */}
        {showHeader && (
          <div className="grid grid-cols-12 gap-3 px-3 pb-2">
            {Array.from({ length: columns }, (_, index) => (
              <div 
                key={index} 
                className={`col-span-${Math.floor(12 / columns)} h-4 bg-gray-200 rounded animate-pulse`}
              />
            ))}
          </div>
        )}

        {/* Table Rows */}
        <div className="divide-y divide-[#f0f2eb]">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-12 gap-3 items-center px-3 py-3"
              style={{ minHeight: "44px" }}
            >
              {Array.from({ length: columns }, (_, colIndex) => (
                <div 
                  key={colIndex} 
                  className={`col-span-${Math.floor(12 / columns)}`}
                >
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-[#e2e6dc] p-4"
            style={{ minHeight: "44px" }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Card stats */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-1" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              </div>
              <div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-1" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              </div>
            </div>

            {/* Card progress bar */}
            <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * CardGridSkeleton - Loading skeleton for card grids
 * 
 * Matches responsive card grid patterns:
 * - Mobile (<640px): 1 column
 * - Tablet (640px-1023px): 2 columns
 * - Desktop (1024px+): 3 columns (or custom)
 * 
 * @param {Object} props
 * @param {number} props.cards - Number of cards to show (default: 6)
 * @param {string} props.columns - Grid columns class (default: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')
 * @param {number} props.cardHeight - Height of each card in pixels (default: 120)
 */
export function CardGridSkeleton({ 
  cards = 6,
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  cardHeight = 120
}) {
  return (
    <div className={`grid ${columns} gap-4`}>
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-[#e2e6dc] p-5"
          style={{ minHeight: `${cardHeight}px` }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1.5" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Card content */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
          </div>

          {/* Card footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ActiveSessionCardSkeleton - Loading skeleton for active session cards
 * 
 * Matches the active session card layout used in LogPractice and Dashboard.
 * Single column on mobile, 2-column on tablet+.
 */
export function ActiveSessionCardSkeleton({ count = 2 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-[#e2e6dc] p-5"
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1.5" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          </div>

          {/* Timer display */}
          <div className="text-center py-4 mb-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-32 mx-auto mb-2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mx-auto" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex-1 h-10 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * RoomCardSkeleton - Loading skeleton for room cards
 * 
 * Matches the room card layout used in RoomSpace.
 * Single column on mobile, 2-column on tablet, 3-column on desktop.
 */
export function RoomCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-[#e2e6dc] p-5 hover:shadow-lg transition-shadow"
        >
          {/* Room header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1.5" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
              </div>
            </div>
          </div>

          {/* Room description */}
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
          </div>

          {/* Room stats */}
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SkillMapCardSkeleton - Loading skeleton for skill map cards
 * 
 * Matches the skill map card layout used in Dashboard and SkillList.
 * Single column on mobile, 2-column on tablet, 3-column on desktop.
 */
export function SkillMapCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-[#e2e6dc] p-5 hover:shadow-lg transition-shadow"
        >
          {/* Skill map header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1.5" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
            </div>
            <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
