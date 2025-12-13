import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../firebase.js"; 
import { signInWithEmailAndPassword } from "firebase/auth"; 
import { Mail, BookOpen, LogIn, Loader, ArrowRight, Eye, EyeOff } from "lucide-react";

// --- START: Component Replacements for UI Consistency ---

// 1. Placeholder for the Logo component (based on the provided style)
const Logo = ({ size = 40, wordmark = true, className = "" }) => {
    return (
        <div className={`flex items-center gap-2 select-none ${className}`}>
            <div
                className="grid place-items-center rounded-lg shadow-md bg-indigo-600"
                style={{
                    width: size,
                    height: size,
                }}
            >
                <BookOpen className="w-5 h-5 text-white" />
            </div>

            {wordmark && (
                <span className="text-2xl font-extrabold tracking-tight">
                    <span className="text-indigo-600">Learn</span>
                    <span className="text-gray-900">Loop</span>
                </span>
            )}
        </div>
    );
};

// 2. Placeholder for AuthLayout (replaced with a simple centered container)
const AuthLayout = ({ title, subtitle, children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-xl shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="text-center">
                <div className="flex justify-center mb-4">
                    <Logo size={40} wordmark={true} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
            </div>
            {/* Content */}
            {children}
        </div>
    </div>
);

// 3. Placeholder for Input (with standard Tailwind classes)
const Input = ({ label, type, value, onChange, placeholder, required }) => (
    <div>
        <label htmlFor={label.toLowerCase()} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <div className="relative">
            <input
                id={label.toLowerCase()}
                name={label.toLowerCase()}
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                autoComplete={type === 'email' ? 'email' : 'off'}
            />
            {label === "Email" && <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />}
        </div>
    </div>
);

// 4. ***UPDATED*** PasswordField with Eye Toggle functionality
const PasswordField = ({ label, value, onChange, placeholder, required }) => {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
        <div>
            <label htmlFor={label.toLowerCase()} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={label.toLowerCase()}
                    name={label.toLowerCase()}
                    // Toggle type based on state
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    // Added pr-10 for the icon spacing
                    className="w-full pl-3 pr-10 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    autoComplete="current-password"
                />
                
                {/* Eye Toggle Button */}
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
};

// 5. Placeholder for Button (Primary CTA style)
const Button = ({ children, disabled, className = "" }) => (
    <button
        type="submit"
        disabled={disabled}
        className={`group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-md shadow-indigo-200 ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
        {children}
    </button>
);

// 6. Placeholder for GhostButton (Secondary CTA style)
const GhostButton = ({ children, onClick, className = "" }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex justify-center py-2.5 px-4 border border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm ${className}`}
    >
        {children}
    </button>
);

// --- END: Component Replacements ---


export default function Login() {
    // Note: The original logic for Firebase is preserved (but commented out for running locally)
    const nav = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState("");

    async function handleLogin(e) {
        e.preventDefault();
        setErr("");
        setMsg("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setMsg("Welcome back!");
            nav("/dashboard", { replace: true });
        } catch (e) {
            const code = e?.code || "";
            const map = {
                "auth/invalid-credential": "Incorrect email or password.",
                "auth/user-not-found": "No account found with this email.",
                "auth/wrong-password": "Incorrect password.",
                "auth/invalid-email": "Please enter a valid email address.",
                "auth/user-disabled": "This account has been disabled.",
                "auth/too-many-requests": "Too many failed attempts. Please try again later."
            };
            setErr(map[code] || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogle() {
        setErr("");
        setMsg("");
        setLoading(true);
        try {
            await signInWithGoogle();
            nav("/dashboard", { replace: true });
        } catch (e) {
            const code = e?.code || "";
            const map = {
                "auth/popup-closed-by-user": "Sign-in was cancelled.",
                "auth/popup-blocked": "Please allow popups for this site.",
                "auth/cancelled-popup-request": "Sign-in was cancelled."
            };
            setErr(map[code] || "Google sign-in failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }


    return (
        <AuthLayout
                title="Log in to LearnLoop"
                subtitle="Welcome back! Enter your credentials to continue."
            >
            {/* Error/Message Alerts */}
            {err && (
                <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                    {err}
                </div>
            )}
            {msg && (
                <div className="bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">
                    {msg}
                </div>
            )}

            {/* Email/Password Form */}
            <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
                <div className="transform transition-all duration-200 hover:scale-[1.005]">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="off"
                    />
                </div>
                <div className="transform transition-all duration-200 hover:scale-[1.005]">
                    <PasswordField
                        label="Password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                    />
                </div>
                
                {/* Submit Button */}
                <Button disabled={loading} className="mt-6 transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]">
                    {loading ? (
                        <span className="flex items-center justify-center gap-2 text-white">
                            <Loader className="animate-spin h-5 w-5" />
                            Signing in...
                        </span>
                    ) : (
                        <span className="text-white flex items-center gap-1.5">
                            <LogIn className="w-5 h-5" />
                            Sign In
                        </span>
                    )}
                </Button>
            </form>

            {/* Separator */}
            <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="font-medium">or continue with</span>
                <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* Google Login Button */}
            <GhostButton 
                onClick={handleGoogle} 
                className="transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] hover:border-indigo-400"
                disabled={loading} // Disable if already loading/signing in
            >
                <span className="inline-flex items-center gap-3 justify-center">
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google logo"
                        className="w-5 h-5"
                    />
                    <span className="font-medium">Google</span>
                </span>
            </GhostButton>

            {/* Footer Links */}
            <div className="flex justify-between text-sm mt-6 pt-4 border-t border-gray-100">
                <Link to="/forgot" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                    Forgot password?
                </Link>
                <Link to="/signup" className="text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-1">
                    Create account 
                    <ArrowRight className="w-4 h-4"/>
                </Link>
            </div>
        </AuthLayout>
    );
}