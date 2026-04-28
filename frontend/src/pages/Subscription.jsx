import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Check, X, ArrowLeft, Zap, Users, Map, FileText,
  CreditCard, Loader2, Trophy, Receipt, Gift, Clock,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useSubscription } from "../context/SubscriptionContext";
import { subscriptionAPI } from "../api/client";

const PLANS = [
  { id: "pro_1month", label: "1 Month", price: 299, perMonth: 299, duration: "1 month", savings: null, badge: null },
  { id: "pro_3month", label: "3 Months", price: 749, perMonth: 250, duration: "3 months", savings: "Save Rs. 148", badge: "Popular" },
  { id: "pro_6month", label: "6 Months", price: 1299, perMonth: 217, duration: "6 months", savings: "Save Rs. 495", badge: "Best Value" },
];

const FEATURES = [
  { name: "Skill Maps", icon: Map, free: "3", pro: "Unlimited" },
  { name: "Nodes per Skill Map", icon: Zap, free: "5", pro: "15" },
  { name: "Sessions per Node", icon: Zap, free: "5", pro: "Unlimited" },
  { name: "Rooms", icon: Users, free: "1", pro: "Unlimited" },
  { name: "Room Members", icon: Users, free: "3", pro: "Unlimited" },
  { name: "PDF Export", icon: FileText, free: false, pro: true },
];

function EsewaLogo({ className = "h-5" }) {
  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#60BB46"/>
      <text x="12" y="28" fill="white" fontWeight="bold" fontSize="22" fontFamily="Arial">e</text>
      <text x="46" y="28" fill="#60BB46" fontWeight="bold" fontSize="20" fontFamily="Arial">Sewa</text>
    </svg>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const { isPro, isFree, isCanceled, usage, limits, initiatePayment, cancel, subscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState("pro_3month");
  const [upgrading, setUpgrading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelConfirmInput, setCancelConfirmInput] = useState("");
  const [billingHistory, setBillingHistory] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

  const fetchBillingHistory = useCallback(async () => {
    try {
      setBillingLoading(true);
      const res = await subscriptionAPI.getBillingHistory();
      setBillingHistory(res.data.history || []);
    } catch {
      setBillingHistory([]);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => { fetchBillingHistory(); }, [fetchBillingHistory]);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true); setMessage(null);
      const result = await initiatePayment(selectedPlan);
      const form = document.createElement("form");
      form.method = "POST"; form.action = result.paymentUrl;
      Object.entries(result.formData).forEach(([k, v]) => {
        const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = String(v); form.appendChild(i);
      });
      document.body.appendChild(form); form.submit();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to initiate payment." });
      setUpgrading(false);
    }
  };

  const handleCancel = () => { setShowCancelModal(true); setCancelConfirmInput(""); };
  const confirmCancel = async () => {
    if (cancelConfirmInput !== "CONFIRM") return;
    try {
      setCanceling(true); setMessage(null); setShowCancelModal(false); setCancelConfirmInput("");
      await cancel();
      setMessage({ type: "success", text: "Subscription canceled. Pro access continues until your billing period ends." });
    } catch { setMessage({ type: "error", text: "Failed to cancel." }); }
    finally { setCanceling(false); }
  };

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="md:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
            <h1 className="text-lg font-bold text-gray-900">Subscription</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 hidden md:block">
            <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Subscription</h1>
            <p className="text-sm text-site-muted mt-2">Manage your plan and billing</p>
          </div>

          {message && message.type === "success" && (
            <div className="mb-6 p-4 rounded-xl border text-sm bg-green-50 border-green-200 text-green-800">
              {message.text}
            </div>
          )}

          {/* ── Current Plan ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${isPro ? 'bg-amber-100' : 'bg-gray-100'}`}>
                  {isPro ? <Crown className="w-6 h-6 text-amber-600" /> : <Zap className="w-6 h-6 text-gray-500" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-site-ink">
                    {isPro ? "Pro Plan" : "Free Plan"}
                    {isPro && isCanceled && <span className="text-sm font-normal text-amber-600 ml-2">(Canceled)</span>}
                  </h2>
                  <p className="text-sm text-site-muted">
                    {isPro ? (isCanceled ? "Pro access continues until period end" : "Full access to all features") : "Basic access with limited features"}
                  </p>
                </div>
              </div>
              {isPro && !isCanceled && (
                <button onClick={handleCancel} disabled={canceling}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  {canceling ? "Canceling..." : "Cancel Plan"}
                </button>
              )}
            </div>
            {isPro && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">Status</p>
                    <p className={`text-sm font-bold ${isCanceled ? 'text-amber-600' : 'text-green-600'}`}>{isCanceled ? 'Canceled' : 'Active'}</p>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-0.5">{isCanceled ? 'Access Until' : 'Renews On'}</p>
                      <p className="text-sm font-bold text-site-ink">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  )}
                  {isCanceled && subscription.canceledAt && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-0.5">Canceled On</p>
                      <p className="text-sm font-bold text-site-ink">{new Date(subscription.canceledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
                {isCanceled && subscription.currentPeriodEnd && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Pro features remain active until <span className="font-bold">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>. After that, your account reverts to Free.
                  </div>
                )}
              </div>
            )}
            {isFree && (
              <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 mb-0.5">Skill Maps</p>
                  <p className="text-lg font-bold text-site-ink">{usage.skillMaps} <span className="text-sm font-normal text-gray-400">/ {limits.maxSkillMaps === -1 ? '∞' : limits.maxSkillMaps}</span></p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 mb-0.5">Rooms</p>
                  <p className="text-lg font-bold text-site-ink">{usage.rooms} <span className="text-sm font-normal text-gray-400">/ {limits.maxRooms === -1 ? '∞' : limits.maxRooms}</span></p>
                </div>
              </div>
            )}
          </div>

          {/* ── Feature Comparison (at top) ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-6">
            <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <span>Feature</span>
              <span className="text-center">Free</span>
              <span className="text-center flex items-center justify-center gap-1"><Crown className="w-3 h-3 text-amber-500" /> Pro</span>
            </div>
            {FEATURES.map(f => (
              <div key={f.name} className="grid grid-cols-3 gap-4 px-5 py-3 border-b border-gray-50 last:border-0 items-center">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <f.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {f.name}
                </div>
                <div className="text-center text-sm text-gray-500">
                  {typeof f.free === "boolean" ? (f.free ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />) : f.free}
                </div>
                <div className="text-center text-sm font-semibold text-site-accent">
                  {typeof f.pro === "boolean" ? (f.pro ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />) : f.pro}
                </div>
              </div>
            ))}
          </div>

          {/* ── Upgrade Section ── */}
          {(isFree || isCanceled) && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-bold text-site-ink mb-1">Upgrade to Pro</h3>
              <p className="text-sm text-site-muted mb-6">Choose a plan that works for you</p>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {PLANS.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${selectedPlan === p.id ? 'border-site-accent bg-site-soft' : 'border-gray-200 hover:border-gray-300'}`}>
                    {p.badge && (
                      <span className={`absolute -top-2.5 left-3 px-2 py-0.5 text-[10px] font-bold rounded-full ${p.badge === 'Best Value' ? 'bg-site-accent text-white' : 'bg-amber-100 text-amber-700'}`}>{p.badge}</span>
                    )}
                    <p className="text-sm font-bold text-site-ink">{p.label}</p>
                    <div className="mt-2"><span className="text-2xl font-bold text-site-ink">Rs. {p.price}</span></div>
                    <p className="text-xs text-gray-400 mt-1">Rs. {p.perMonth}/month</p>
                    {p.savings && <p className="text-xs font-semibold text-green-600 mt-1">{p.savings}</p>}
                    {selectedPlan === p.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-site-accent rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Billing Summary */}
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <h4 className="text-sm font-bold text-site-ink mb-3">Billing Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium text-site-ink">Pro — {plan.label}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium text-site-ink">{plan.duration}</span></div>
                  {plan.savings && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="font-medium text-green-600">-{plan.savings.replace('Save ', '')}</span></div>}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-site-ink">Total</span>
                    <span className="font-bold text-site-ink text-lg">Rs. {plan.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-site-ink mb-3">Payment Method</h4>
                <div className="flex items-center gap-3 p-4 border-2 border-site-accent bg-site-soft rounded-xl">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-gray-100">
                    <img
                      src="https://cdn.esewa.com.np/ui/images/logos/esewa-icon-large.png"
                      alt="eSewa"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://cdn.esewa.com.np/ui/images/esewa_og.png";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-site-ink">eSewa</p>
                    <p className="text-xs text-gray-400">Pay securely with your eSewa wallet</p>
                  </div>
                  <div className="w-5 h-5 bg-site-accent rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                </div>
              </div>

              {/* Pay Button */}
              <button onClick={handleUpgrade} disabled={upgrading}
                className="w-full py-3.5 bg-site-accent text-white rounded-xl font-semibold hover:bg-site-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {upgrading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to eSewa...</>) : (<><CreditCard className="w-4 h-4" /> Pay Rs. {plan.price} with eSewa</>)}
              </button>
              {message && message.type === "error" && (
                <div className="mt-3 p-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-700">
                  {message.text}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center mt-3">You'll be redirected to eSewa to complete payment. Pro access starts immediately.</p>
            </div>
          )}

          {/* ── Billing History ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Receipt className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-bold text-site-ink">Billing History</h3>
            </div>

            {billingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-site-muted">No billing history yet</p>
                <p className="text-xs text-gray-400 mt-1">Purchases and rewards will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {billingHistory.map(item => {
                  const isReward = item.type === 'reward';
                  const isComplete = item.status === 'COMPLETE';
                  const statusColors = {
                    COMPLETE: 'bg-green-50 text-green-700',
                    PENDING: 'bg-yellow-50 text-yellow-700',
                    FAILED: 'bg-red-50 text-red-700',
                    CANCELED: 'bg-gray-50 text-gray-500',
                  };
                  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isReward ? 'bg-amber-100' : 'bg-green-100'}`}>
                        {isReward ? (
                          <span className="text-lg">{medals[item.rank] || '🏆'}</span>
                        ) : (
                          <CreditCard className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-site-ink truncate">{item.label}</p>
                          {isReward && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 flex-shrink-0">
                              <Gift className="w-3 h-3" /> Reward
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span className="text-gray-300">·</span>
                          <p className="text-xs text-gray-400">{item.method}</p>
                          {item.transactionId && (
                            <>
                              <span className="text-gray-300">·</span>
                              <p className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{item.transactionId}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isReward ? (
                          <p className="text-sm font-bold text-amber-600">Free</p>
                        ) : (
                          <p className="text-sm font-bold text-site-ink">Rs. {item.amount}</p>
                        )}
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[item.status] || 'bg-gray-50 text-gray-500'}`}>
                          {item.status === 'COMPLETE' ? 'Paid' : item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-site-ink mb-2">Cancel Pro Subscription?</h3>
            <p className="text-sm text-site-muted mb-1">You'll lose access to Pro features at the end of your billing period.</p>
            <p className="text-sm text-site-muted mb-4">Type <span className="font-mono font-semibold text-site-ink">CONFIRM</span> below.</p>
            <input type="text" value={cancelConfirmInput} onChange={(e) => setCancelConfirmInput(e.target.value)}
              placeholder="Type CONFIRM" autoComplete="off"
              className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-red-500 transition-colors bg-gray-50 focus:bg-white font-mono text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelModal(false); setCancelConfirmInput(""); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50">Keep Plan</button>
              <button onClick={confirmCancel} disabled={cancelConfirmInput !== "CONFIRM" || canceling}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {canceling ? "Canceling..." : "Cancel Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
