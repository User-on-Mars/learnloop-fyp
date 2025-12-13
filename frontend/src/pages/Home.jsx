import { Link } from "react-router-dom";
import { BookOpen, Target, TrendingUp, ArrowRight, ClipboardClock } from "lucide-react";

export default function Home() {
  return (
    // Main container with a simple white background
    <div className="min-h-screen bg-white">
      
      {/* Header/Navbar - Simplified and sticky */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">
              LearnLoop
            </span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-gray-700 hover:text-indigo-600 font-medium px-3 py-1.5 rounded-md transition-colors text-sm"
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-indigo-700 transition-all text-sm"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>
      
      {/* Hero Section - Clean, focused, and removed statistics */}
      <section className="bg-gray-50 pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              Track Your Learning Journey
            </h1>
            
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              Simple, powerful tools to help you visualize progress, set goals, and grow your skills faster.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-7 py-3 rounded-md font-semibold text-base hover:bg-indigo-700 transition-all shadow-md"
              >
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-7 py-3 rounded-md font-semibold text-base border border-gray-300 hover:bg-gray-100 transition-all"
              >
                Login
              </Link>
            </div>
            

          </div>
        </div>
      </section>

      {/* Features Section - Simple Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Core Features
            </h2>
            <p className="text-lg text-gray-600">
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Feature Card 1 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center mb-4">
                <ClipboardClock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Track Progress</h3>
              <p className="text-gray-600 text-sm">
                Monitor your learning journey with clear, visual progress tracking.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Set Goals</h3>
              <p className="text-gray-600 text-sm">
                Create achievable learning goals and stay motivated with milestones.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Visualize Growth</h3>
              <p className="text-gray-600 text-sm">
                See your skills improve over time with easy-to-read charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action (CTA) Section - Simple and high-contrast */}
      <section className="py-16 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Ready to Start Tracking?
          </h2>
          <div>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-md font-bold text-base hover:bg-gray-100 transition-all shadow-lg"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Minimal and simple */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Footer Links (Simplified) */}
          <div className="flex justify-center gap-6 text-sm text-gray-400 mb-4">
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <a href="#" className="hover:text-white transition-colors">Terms & Privacy</a>
          </div>
          
          <div className="text-sm text-gray-500 pt-4 border-t border-gray-700">
            <p>© 2024 LearnLoop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}