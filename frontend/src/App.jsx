import { Link } from 'react-router-dom'
export default function App(){
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="p-8 rounded-2xl shadow bg-white w-[420px]">
        <h1 className="text-2xl font-bold mb-2">LearnLoop</h1>
        <p className="text-gray-600 mb-6">Reflective Skill Development Tracker</p>
        <div className="space-y-3">
          <Link className="block text-center bg-black text-white rounded-lg py-2" to="/login">Login</Link>
          <Link className="block text-center border rounded-lg py-2" to="/signup">Create an account</Link>
          <Link className="block text-center text-sm text-gray-600" to="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
