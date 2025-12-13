export default function SkillProgressCard({ 
  progress = 0, 
  completedSkills = 0, 
  totalSkills = 0, 
  hoursLogged = 0,
  isLoading = false 
}) {
  // Calculate circle properties for SVG progress ring
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Skill Progress</h3>
        <div className="flex flex-col items-center">
          {/* Skeleton for circular progress */}
          <div className="relative w-48 h-48 mb-6">
            <div className="w-full h-full rounded-full bg-gray-200 animate-pulse"></div>
          </div>
          {/* Skeleton for metrics */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Skill Progress</h3>
      
      <div className="flex flex-col items-center">
        {/* Circular Progress Ring */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#0284c7"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Center text showing percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{progress}%</div>
              <div className="text-sm text-gray-600 mt-1">Complete</div>
            </div>
          </div>
        </div>

        {/* Bottom metrics */}
        <div className="w-full grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {completedSkills}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Skills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalSkills}
            </div>
            <div className="text-sm text-gray-600 mt-1">Mastered</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full mt-6">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Goal: 85%</span>
            <span>Current: {progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-ll-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
