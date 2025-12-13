import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import AuthDebug from './components/AuthDebug'

export default function App(){
  const user = useAuth();

  // If user is logged in, redirect to dashboard
  if (user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="p-8 rounded-2xl shadow bg-white w-[420px] text-center">
          <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
          <p className="text-gray-600 mb-6">You are already logged in.</p>
          <Link className="block text-center bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700" to="/dashboard">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <AuthDebug />
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-2xl font-bold mb-2">LearnLoop</h1>
        <p className="text-gray-600 mb-6">Reflective Skill Development Tracker</p>
        <div className="space-y-3">
          <Link className="block text-center bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700" to="/login">Login</Link>
          <Link className="block text-center border border-gray-300 rounded-lg py-2 hover:bg-gray-50" to="/signup">Create an account</Link>
          <Link className="block text-center text-sm text-gray-600 hover:text-gray-900" to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
