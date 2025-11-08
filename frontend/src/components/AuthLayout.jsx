import Logo from "./Logo";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ll-50 via-white to-ll-100">
      {/* Top bar */}
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <Logo size={44} />
      </div>

      {/* Main grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-2 gap-10 items-center">
        {/* Left: narrative / marketing copy — EDIT THIS TEXT */}
        <div className="hidden md:block">
          <h1 className="text-4xl font-extrabold text-ll-900 leading-tight">
            Map your skills. <span className="text-ll-600">Grow faster.</span>
          </h1>

          <p className="mt-4 text-gray-700 max-w-md">
            LearnLoop helps you track progress, visualize your skill map, and plan
            nodes for continuous improvement.
          </p>

          <ul className="mt-6 space-y-2 text-gray-800">
            <li>• Secure authentication (Email &amp; Google)</li>
            <li>• Clean dashboard with quick actions</li>
          </ul>
        </div>

        {/* Right: auth card */}
        <div className="w-full">
          <div className="bg-white/85 backdrop-blur shadow-xl rounded-2xl p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
