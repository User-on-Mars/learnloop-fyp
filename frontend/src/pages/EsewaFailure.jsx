import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";

/**
 * eSewa redirects here when a payment fails or is canceled by the user.
 */
export default function EsewaFailure() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-site-ink mb-2">
            Payment Canceled
          </h2>
          <p className="text-site-muted text-sm mb-6">
            Your payment was not completed. No charges were made to your eSewa
            account. You can try again anytime.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate("/subscription")}
              className="px-5 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
