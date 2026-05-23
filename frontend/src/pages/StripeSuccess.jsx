import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useSubscription } from "../context/SubscriptionContext";

export default function StripeSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyStripePayment, refresh } = useSubscription();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        setStatus("error");
        setMessage("No Stripe session ID was received.");
        return;
      }

      try {
        const result = await verifyStripePayment(sessionId);
        if (result.payment?.status === "COMPLETE" && result.payment?.applied) {
          setStatus("success");
          setMessage("Your Pro subscription is now active!");
          await refresh();
        } else {
          setStatus("error");
          setMessage(`Payment status: ${result.payment?.status || "unknown"}. Please contact support if you were charged.`);
        }
      } catch (err) {
        console.error("Stripe payment verification error:", err);
        setStatus("error");
        setMessage(err.response?.data?.message || "Failed to verify Stripe payment. Please contact support.");
      }
    };

    verify();
  }, [searchParams, verifyStripePayment, refresh]);

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-16 h-16 text-site-accent mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-site-ink mb-2">Verifying Card Payment...</h2>
              <p className="text-site-muted text-sm">Please wait while we confirm your payment with Stripe.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-site-ink mb-2">Payment Successful!</h2>
              <p className="text-site-muted text-sm mb-6">{message}</p>
              <button
                onClick={() => navigate("/subscription")}
                className="px-6 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors"
              >
                View Subscription
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-site-ink mb-2">Payment Issue</h2>
              <p className="text-site-muted text-sm mb-6">{message}</p>
              <button
                onClick={() => navigate("/subscription")}
                className="px-5 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
              >
                Back to Subscription
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
