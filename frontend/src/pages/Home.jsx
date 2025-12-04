import { Link } from "react-router-dom";
import { BookOpen, Target, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-ll-50 to-white relative">
      {/* Grid Pattern Background - Full Page */}
      <div className="fixed inset-0 bg-grid-pattern-light opacity-30 pointer-events-none"></div>
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-ll-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-ll-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-ll-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Floating Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
        <motion.nav 
          className="max-w-6xl mx-auto bg-white/90 backdrop-blur-md shadow-lg rounded-2xl border border-gray-200"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        >
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ll-600 to-ll-700 rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  LearnLoop
                </span>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-gray-900 font-medium px-5 py-2 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-gradient-to-r from-ll-600 to-ll-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-ll-700 hover:to-ll-800 transition-all shadow-lg shadow-ll-200 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.nav>
      </div>
      
      {/* Spacer for fixed navbar */}
      <div className="h-20"></div>

      {/* Hero Section with Grid Pattern */}
      <section className="relative bg-gradient-to-br from-ll-600 to-ll-800 text-white overflow-hidden">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Track Your Learning Journey
            </motion.h1>
            
            <motion.p 
              className="text-xl text-ll-100 mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Simple, powerful tools to help you visualize progress, set goals, and grow your skills faster.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Link 
                to="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-white text-ll-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                <span>Start Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center gap-2 bg-ll-700 text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-ll-500 hover:bg-ll-600 transition-all hover:scale-105 active:scale-95"
              >
                Login
              </Link>
            </motion.div>

            {/* Simple Stats */}
            <motion.div 
              className="flex gap-8 justify-center mt-16 pt-8 border-t border-ll-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div>
                <div className="text-3xl font-bold">10k+</div>
                <div className="text-sm text-ll-200">Learners</div>
              </div>
              <div>
                <div className="text-3xl font-bold">50k+</div>
                <div className="text-sm text-ll-200">Skills</div>
              </div>
              <div>
                <div className="text-3xl font-bold">95%</div>
                <div className="text-sm text-ll-200">Success</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative bg-white">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern-light opacity-20"></div>
        
        {/* Decorative Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-ll-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-ll-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple & Powerful
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to track your learning
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="bg-white p-8 rounded-xl border border-gray-200 hover:border-ll-300 hover:shadow-lg transition-all hover:-translate-y-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-ll-600 to-ll-700 rounded-lg flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Track Progress</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor your learning journey with detailed analytics and visual progress tracking.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white p-8 rounded-xl border border-gray-200 hover:border-ll-300 hover:shadow-lg transition-all hover:-translate-y-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-ll-600 to-ll-700 rounded-lg flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Set Goals</h3>
              <p className="text-gray-600 leading-relaxed">
                Create meaningful learning goals and stay motivated with milestone tracking.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white p-8 rounded-xl border border-gray-200 hover:border-ll-300 hover:shadow-lg transition-all hover:-translate-y-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-ll-600 to-ll-700 rounded-lg flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Visualize Growth</h3>
              <p className="text-gray-600 leading-relaxed">
                See your skills improve over time with beautiful charts and skill maps.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-ll-600 to-ll-800 text-white overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Ready to Start?
          </motion.h2>
          <motion.p 
            className="text-xl text-ll-100 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Join thousands of learners tracking their progress with LearnLoop
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 bg-white text-ll-700 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-ll-600 to-ll-700 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">LearnLoop</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 LearnLoop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
