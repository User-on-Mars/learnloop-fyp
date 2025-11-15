import Sidebar from "../components/Sidebar";
import DashboardGreeting from "../components/DashboardGreeting";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Header Section with Personalized Greeting */}
          <DashboardGreeting />
          
          {/* Dashboard content will be added in subsequent tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Placeholder for dashboard cards */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-2">Welcome to LearnLoop</h2>
              <p className="text-gray-600">Your dashboard is being built...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
