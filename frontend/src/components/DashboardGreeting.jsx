import { useAuth } from "../useAuth";

export default function DashboardGreeting() {
  const user = useAuth();

  // Get display name from Firebase auth user object
  const displayName = user?.displayName || user?.email?.split('@')[0] || null;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        {displayName ? `Welcome back, ${displayName}!` : "Welcome back!"}
      </h1>
    </div>
  );
}
