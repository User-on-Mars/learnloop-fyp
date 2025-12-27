import { Clock, FileText } from 'lucide-react'; // Using Lucide icons for cleaner look

export default function TodayActivityCard({ 
    minutesPracticed = 0, 
    notesAdded = 0,
    isLoading = false 
}) {
    // Format minutes to hours and minutes
    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) {
            return `${hours}h ${mins}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${mins}m`;
        }
    };
    
    // Constant colors for Indigo theme consistency
    const primaryBg = 'bg-indigo-50';
    const primaryText = 'text-indigo-600';
    const hoverText = 'hover:text-indigo-700';

    if (isLoading) {
        // Consistent Card Styling for Loading State
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Today's Activity</h3>
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
        // Consistent Card Styling
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Today's Activity</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-6">
                {/* Minutes Practiced Metric */}
                <div className="flex flex-col items-center border-r border-gray-100">
                    {/* Clock Icon - Styled with Indigo theme */}
                    <div className={`w-12 h-12 rounded-full ${primaryBg} flex items-center justify-center mb-3 shadow-sm`}>
                        <Clock 
                            className={`w-6 h-6 ${primaryText}`} 
                            aria-hidden="true"
                        />
                    </div>
                    
                    {/* Value with animation */}
                    <div className="text-3xl font-extrabold text-gray-900 transition-all duration-300 ease-out">
                        {formatTime(minutesPracticed)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">practice logged</div>
                </div>

                {/* Notes Added Metric */}
                <div className="flex flex-col items-center">
                    {/* Document Icon - Styled with Indigo theme */}
                    <div className={`w-12 h-12 rounded-full ${primaryBg} flex items-center justify-center mb-3 shadow-sm`}>
                        <FileText 
                            className={`w-6 h-6 ${primaryText}`} 
                            aria-hidden="true"
                        />
                    </div>
                    
                    {/* Value with animation */}
                    <div className="text-3xl font-extrabold text-gray-900 transition-all duration-300 ease-out">
                        {notesAdded}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">notes recorded</div>
                </div>
            </div>

            {/* View Full Log Link - Styled with Indigo theme */}
            <div className="mt-4">
                <button className={`text-sm ${primaryText} ${hoverText} font-medium transition-colors`}>
                    View Full Log →
                </button>
            </div>
        </div>
    );
}