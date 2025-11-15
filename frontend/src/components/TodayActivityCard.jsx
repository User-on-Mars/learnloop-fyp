export default function TodayActivityCard({ 
  minutesPracticed = 0, 
  notesAdded = 0,
  isLoading = false 
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Activity</h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Skeleton for minutes practiced */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-3"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          {/* Skeleton for notes added */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-3"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Activity</h3>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Minutes Practiced Metric */}
        <div className="flex flex-col items-center">
          {/* Clock Icon */}
          <div className="w-12 h-12 rounded-full bg-ll-50 flex items-center justify-center mb-3">
            <svg 
              className="w-6 h-6 text-ll-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          {/* Value with animation */}
          <div className="text-2xl font-bold text-gray-900 transition-all duration-300 ease-out">
            {minutesPracticed}
          </div>
          <div className="text-sm text-gray-600 mt-1">Minutes Practiced</div>
        </div>

        {/* Notes Added Metric */}
        <div className="flex flex-col items-center">
          {/* Document Icon */}
          <div className="w-12 h-12 rounded-full bg-ll-50 flex items-center justify-center mb-3">
            <svg 
              className="w-6 h-6 text-ll-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          
          {/* Value with animation */}
          <div className="text-2xl font-bold text-gray-900 transition-all duration-300 ease-out">
            {notesAdded}
          </div>
          <div className="text-sm text-gray-600 mt-1">Notes Added</div>
        </div>
      </div>
    </div>
  );
}
