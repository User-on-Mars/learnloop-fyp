/**
 * SkeletonDemo - Visual testing page for responsive skeleton components
 * 
 * This demo page allows manual testing of skeleton components at different breakpoints.
 * To use: Import this component in your app and navigate to it.
 * 
 * Test at these viewport widths:
 * - 375px (mobile)
 * - 768px (tablet)
 * - 1024px (desktop)
 */

import {
  HeroSectionSkeleton,
  DataTableSkeleton,
  CardGridSkeleton,
  ActiveSessionCardSkeleton,
  RoomCardSkeleton,
  SkillMapCardSkeleton,
} from '../ResponsiveSkeletons';

export default function SkeletonDemo() {
  return (
    <div className="min-h-screen bg-[#f8faf6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a] mb-2">
            Responsive Skeleton Components Demo
          </h1>
          <p className="text-sm text-[#565c52]">
            Test these skeletons at different viewport widths: 375px (mobile), 768px (tablet), 1024px (desktop)
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-[#f5f7f2] text-xs font-medium rounded-full">
              Mobile: &lt;640px
            </span>
            <span className="px-3 py-1 bg-[#f5f7f2] text-xs font-medium rounded-full">
              Tablet: 640px-1023px
            </span>
            <span className="px-3 py-1 bg-[#f5f7f2] text-xs font-medium rounded-full">
              Desktop: 1024px+
            </span>
          </div>
        </div>

        {/* HeroSectionSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">HeroSectionSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              Vertical stack on mobile, horizontal on sm+. Stat grid: 2 cols mobile, 4 cols tablet+
            </p>
          </div>
          <HeroSectionSkeleton />
        </section>

        {/* HeroSectionSkeleton with 5 stats */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">HeroSectionSkeleton (5 stats)</h2>
            <p className="text-sm text-[#565c52]">
              Custom stat count: 2 cols mobile, 5 cols desktop
            </p>
          </div>
          <HeroSectionSkeleton 
            statsCount={5} 
            statsColumns="grid-cols-2 sm:grid-cols-5" 
          />
        </section>

        {/* HeroSectionSkeleton without actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">HeroSectionSkeleton (no actions)</h2>
            <p className="text-sm text-[#565c52]">
              Without action buttons
            </p>
          </div>
          <HeroSectionSkeleton showActions={false} />
        </section>

        {/* DataTableSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">DataTableSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              Table on desktop (sm+), cards on mobile. Min 44px tap targets.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5">
            <DataTableSkeleton rows={5} columns={5} />
          </div>
        </section>

        {/* DataTableSkeleton without header */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">DataTableSkeleton (no header)</h2>
            <p className="text-sm text-[#565c52]">
              Without table header
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5">
            <DataTableSkeleton rows={3} columns={4} showHeader={false} />
          </div>
        </section>

        {/* CardGridSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">CardGridSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              1 col mobile, 2 cols tablet, 3 cols desktop
            </p>
          </div>
          <CardGridSkeleton cards={6} />
        </section>

        {/* CardGridSkeleton with 4 columns */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">CardGridSkeleton (4 columns)</h2>
            <p className="text-sm text-[#565c52]">
              1 col mobile, 2 cols tablet, 4 cols desktop
            </p>
          </div>
          <CardGridSkeleton 
            cards={8} 
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" 
          />
        </section>

        {/* ActiveSessionCardSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">ActiveSessionCardSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              1 col mobile, 2 cols tablet+. Used in LogPractice and Dashboard.
            </p>
          </div>
          <ActiveSessionCardSkeleton count={2} />
        </section>

        {/* RoomCardSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">RoomCardSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              1 col mobile, 2 cols tablet, 3 cols desktop. Used in RoomSpace.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5">
            <RoomCardSkeleton count={6} />
          </div>
        </section>

        {/* SkillMapCardSkeleton Demo */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#1c1f1a] mb-1">SkillMapCardSkeleton</h2>
            <p className="text-sm text-[#565c52]">
              1 col mobile, 2 cols tablet, 3 cols desktop. Used in Dashboard and SkillList.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5">
            <SkillMapCardSkeleton count={6} />
          </div>
        </section>

        {/* Breakpoint Indicator */}
        <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6">
          <h2 className="text-xl font-bold text-[#1c1f1a] mb-4">Current Breakpoint</h2>
          <div className="space-y-2">
            <div className="sm:hidden px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
              📱 Mobile (&lt;640px)
            </div>
            <div className="hidden sm:block lg:hidden px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
              📱 Tablet (640px-1023px)
            </div>
            <div className="hidden lg:block px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-medium">
              💻 Desktop (1024px+)
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="bg-white rounded-2xl border border-[#e2e6dc] p-6">
          <h2 className="text-xl font-bold text-[#1c1f1a] mb-4">Testing Instructions</h2>
          <ol className="space-y-2 text-sm text-[#565c52]">
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">1.</span>
              <span>Open Chrome DevTools (F12) and toggle device toolbar (Ctrl+Shift+M)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">2.</span>
              <span>Test at 375px width (iPhone SE) - verify single column layouts</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">3.</span>
              <span>Test at 768px width (iPad) - verify 2-column layouts</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">4.</span>
              <span>Test at 1024px width (Desktop) - verify 3+ column layouts</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">5.</span>
              <span>Verify all skeletons have smooth pulse animation</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">6.</span>
              <span>Verify DataTableSkeleton switches between table and cards</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#1c1f1a]">7.</span>
              <span>Verify HeroSectionSkeleton layout changes (vertical → horizontal)</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
