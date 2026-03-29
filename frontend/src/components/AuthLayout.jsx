import { motion } from "framer-motion";
import Logo from "./Logo";
import { BookOpen, Target, TrendingUp, Sparkles } from "lucide-react";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ll-50 via-white to-ll-100 relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-grid-pattern-light opacity-40"></div>
      
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ll-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-ll-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-ll-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Top bar */}
      <motion.div 
        className="mx-auto max-w-6xl px-4 pt-10 relative z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo size={44} />
      </motion.div>

      {/* Main grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-2 gap-10 items-center relative z-10">
        {/* Left: narrative / marketing copy */}
        <motion.div 
          className="hidden md:block"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-ll-100 text-ll-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Your Learning Journey</span>
          </motion.div>

          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Map your skills. <br />
            <span className="bg-gradient-to-r from-ll-600 to-ll-700 bg-clip-text text-transparent">
              Grow faster.
            </span>
          </h1>

          <p className="text-lg text-gray-700 max-w-md mb-8 leading-relaxed">
            LearnLoop helps you track progress, visualize your skill map, and plan
            your path for continuous improvement.
          </p>

          <div className="space-y-4">
            <motion.div 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-ll-500 to-ll-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Track Your Progress</div>
                <div className="text-sm text-gray-600">Monitor your learning journey with detailed analytics</div>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-ll-600 to-ll-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Set Meaningful Goals</div>
                <div className="text-sm text-gray-600">Create and achieve your learning objectives</div>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-ll-700 to-ll-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Visualize Growth</div>
                <div className="text-sm text-gray-600">See your skills improve with beautiful charts</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right: auth card */}
        <motion.div 
          className="w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <motion.div 
            className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-gray-200"
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
              )}
            </div>
            {children}
          </motion.div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
