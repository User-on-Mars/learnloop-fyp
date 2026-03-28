import { Link } from 'react-router-dom';
import { Zap, Clock } from 'lucide-react';

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
    
    const primaryColor = '#2e5023';

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
        <div className="bg-site-surface rounded-xl shadow-md border border-site-border p-6 hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-xl font-bold text-site-ink mb-6">Overall Progress</h3>
            
            <div className="flex flex-col items-center">
                {/* Circular Progress Ring */}
                <div className="relative w-48 h-48 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        {/* Background circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="#e2e8f0"
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
                            <div className="text-4xl font-extrabold" style={{ color: primaryColor }}>{progress}%</div>
                            <div className="text-sm text-site-muted mt-1">Goal Progress</div>
                        </div>
                    </div>
                </div>

                {/* Bottom metrics */}
                <div className="w-full grid grid-cols-3 gap-4 border-t border-site-border pt-4">
                    
                    {/* Metric 1: Skills Mastered (Using Completed Skills) */}
                    <div className="text-center">
                        <div className="text-2xl font-bold text-site-ink inline-flex items-center gap-1.5">
                            <Zap className="w-5 h-5 text-site-accent" />
                            {skillsMastered}
                        </div>
                        <div className="text-xs text-site-faint mt-1">Mastered Skills</div>
                    </div>

                    {/* Metric 2: Total Skills (In Progress) */}
                    <div className="text-center border-l border-r border-site-border">
                        <div className="text-2xl font-bold text-site-ink">
                            {skillsInProgress}
                        </div>
                        <div className="text-xs text-site-faint mt-1">Total Mapped</div>
                    </div>
                    
                    {/* Metric 3: Hours Logged */}
                    <div className="text-center">
                        <div className="text-2xl font-bold text-site-ink inline-flex items-center gap-1.5">
                            <Clock className="w-5 h-5 text-site-accent" />
                            {hoursLogged}h
                        </div>
                        <div className="text-xs text-site-faint mt-1">Hours Logged</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full mt-6">
                    <div className="flex justify-between text-xs font-medium text-site-muted mb-2">
                        <span>Completion Rate</span>
                        <span className="text-site-accent">Current: {progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-site-bg rounded-full overflow-hidden border border-site-border">
                        <div 
                            className="h-full bg-site-accent rounded-full transition-all duration-500 ease-out shadow-inner"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                
                <Link
                    to="/skills"
                    className="mt-4 inline-block text-xs font-medium text-site-ink underline-offset-2 transition-colors duration-150 hover:[color:var(--site-accent,#2e5023)] hover:underline hover:decoration-site-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-accent"
                >
                    View Skill Maps
                </Link>
            </div>
        </div>
    );
}