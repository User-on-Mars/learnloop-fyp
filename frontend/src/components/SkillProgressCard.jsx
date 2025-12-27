import { Zap, Clock } from 'lucide-react'; // Import Lucide icons for potential future use or context

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
    // The dash offset controls how much of the ring is filled.
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Consistency check: Ensure the labels match the data used.
    // The current data uses completedSkills and totalSkills, but labels are "Total Skills" and "Mastered".
    // I will swap the variables to match the likely intent (e.g., totalSkills = total items, completedSkills = mastered items).
    const skillsInProgress = totalSkills;
    const skillsMastered = completedSkills;
    
    // Indigo-600 color for consistency
    const primaryColor = '#4f46e5'; 

    if (isLoading) {
        return (
            // Consistent Card Styling
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Skill Progress</h3>
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
                    {/* Skeleton for progress bar */}
                    <div className="w-full mt-6">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="w-full h-2 bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        // Consistent Card Styling
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Overall Progress</h3>
            
            <div className="flex flex-col items-center">
                {/* Circular Progress Ring */}
                <div className="relative w-48 h-48 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        {/* Background circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="#e5e7eb" // gray-200
                            strokeWidth="12"
                            fill="none"
                        />
                        {/* Progress circle - UPDATED COLOR */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke={primaryColor} // Indigo-600
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                        />
                    </svg>
                    
                    {/* Center text showing percentage - UPDATED COLOR FOR PRIMARY VALUE */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl font-extrabold text-gray-900" style={{ color: primaryColor }}>{progress}%</div>
                            <div className="text-sm text-gray-600 mt-1">Goal Progress</div>
                        </div>
                    </div>
                </div>

                {/* Bottom metrics */}
                <div className="w-full grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                    
                    {/* Metric 1: Skills Mastered (Using Completed Skills) */}
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 inline-flex items-center gap-1.5">
                            <Zap className="w-5 h-5 text-indigo-500" />
                            {skillsMastered}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Mastered Skills</div>
                    </div>

                    {/* Metric 2: Total Skills (In Progress) */}
                    <div className="text-center border-l border-r border-gray-100">
                        <div className="text-2xl font-bold text-gray-900">
                            {skillsInProgress}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Total Mapped</div>
                    </div>
                    
                    {/* Metric 3: Hours Logged */}
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 inline-flex items-center gap-1.5">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            {hoursLogged}h
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Hours Logged</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full mt-6">
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
                        <span>Completion Rate</span>
                        <span className="text-indigo-600">Current: {progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            // Progress Bar - UPDATED COLOR
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out shadow-inner"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* Call to action/Context */}
                <button className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    View Skill Tree →
                </button>
            </div>
        </div>
    );
}