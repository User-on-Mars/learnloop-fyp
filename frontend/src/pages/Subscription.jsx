import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Check, X, Zap, Users, Map, FileText,
  CreditCard, Loader2, Receipt, Gift, Clock, Star, Shield, Sparkles,
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

export default function Subscription() {
  const navigate = useNavigate();
  const { isPro, isFree, isCanceled, isRewarded, usage, limits, initiatePayment, cancel, subscription } = useSubscription();
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
    } catch { setBillingHistory([]); }
    finally { setBillingLoading(false); }
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

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-[#f8faf6]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
        <div className="px-4 sm:px-6 py-6 lg:py-8 space-y-6">

          {/* Hero Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-purple-50 rounded-2xl border border-violet-100 p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-violet-200 opacity-15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-purple-200 opacity-10 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isPro ? (isRewarded ? 'bg-gradient-to-br from-amber-500 to-yellow-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500') : 'bg-gradient-to-br from-violet-600 to-purple-600'}`}>
                    {isRewarded ? <Gift className="w-6 h-6 text-white" /> : <Crown className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a]">
                      {isPro ? "Pro Plan" : "Free Plan"}
                      {isPro && isCanceled && <span className="text-base font-normal text-amber-600 ml-2">(Canceled)</span>}
                      {isPro && isRewarded && !isCanceled && <span className="text-base font-normal text-amber-500 ml-2">(Reward)</span>}
                    </h1>
                    <p className="text-sm text-violet-600 font-medium">
                      {isPro ? (isRewarded ? "Earned from leaderboard placement" : isCanceled ? "Access continues until period end" : "Full access to all features") : "Upgrade to unlock everything"}
                    </p>
                  </div>
                </div>
                <p className="text-[#565c52] text-[15px] leading-relaxed max-w-xl">
                  {isPro ? (isRewarded ? "You earned Pro access from the weekly leaderboard. Keep competing to extend it!" : "You have full access to all Pro features. Manage your subscription below.") : "Unlock unlimited skill maps, rooms, and more with Pro."}
                </p>
              </div>

              {isPro && !isCanceled && !isRewarded && (
                <button onClick={handleCancel} disabled={canceling}
                  className="px-5 py-2.5 border border-[#e2e6dc] text-[#9aa094] rounded-xl text-sm font-medium hover:bg-white hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 self-start sm:self-center">
                  {canceling ? "Canceling..." : "Cancel Plan"}
                </button>
              )}
            </div>

            {/* Plan Stats */}
            {isPro && (
              <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-violet-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCanceled ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <Shield className={`w-5 h-5 ${isCanceled ? 'text-amber-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold leading-none ${isCanceled ? 'text-amber-600' : 'text-emerald-600'}`}>{isCanceled ? 'Canceled' : 'Active'}</p>
                    <p className="text-[11px] text-[#9aa094] mt-0.5">Status</p>
                  </div>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1c1f1a] leading-none">{fmtDate(subscription.currentPeriodEnd)}</p>
                      <p className="text-[11px] text-[#9aa094] mt-0.5">{isCanceled ? 'Access Until' : 'Renews On'}</p>
                    </div>
                  </div>
                )}
                {isCanceled && subscription.canceledAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <X className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1c1f1a] leading-none">{fmtDate(subscription.canceledAt)}</p>
                      <p className="text-[11px] text-[#9aa094] mt-0.5">Canceled On</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isFree && (
              <div className="relative grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-violet-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Map className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#1c1f1a] leading-none">{usage.skillMaps} <span className="text-sm font-normal text-[#9aa094]">/ {limits.maxSkillMaps === -1 ? '∞' : limits.maxSkillMaps}</span></p>
                    <p className="text-[11px] text-[#9aa094] mt-0.5">Skill Maps</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#1c1f1a] leading-none">{usage.rooms} <span className="text-sm font-normal text-[#9aa094]">/ {limits.maxRooms === -1 ? '∞' : limits.maxRooms}</span></p>
                    <p className="text-[11px] text-[#9aa094] mt-0.5">Rooms</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {message && message.type === "success" && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
              <Check className="w-4 h-4 flex-shrink-0" />{message.text}
            </div>
          )}

          {/* Feature Comparison */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Feature Comparison</h2>
                <p className="text-[11px] text-[#9aa094]">See what you get with Pro</p>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-[#f8faf6] border-b border-[#e8ece3] text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider">
                <span>Feature</span>
                <span className="text-center">Free</span>
                <span className="text-center flex items-center justify-center gap-1"><Crown className="w-3 h-3 text-amber-500" /> Pro</span>
              </div>
              {FEATURES.map((f, i) => (
                <div key={f.name} className={`grid grid-cols-3 gap-4 px-5 py-3.5 items-center ${i < FEATURES.length - 1 ? 'border-b border-[#f0f2eb]' : ''}`}>
                  <div className="flex items-center gap-2.5 text-sm text-[#1c1f1a]">
                    <div className="w-8 h-8 rounded-lg bg-[#f8faf6] flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-4 h-4 text-[#9aa094]" />
                    </div>
                    <span className="font-medium">{f.name}</span>
                  </div>
                  <div className="text-center text-sm text-[#9aa094]">
                    {typeof f.free === "boolean" ? (f.free ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-[#d0d5ca] mx-auto" />) : f.free}
                  </div>
                  <div className="text-center text-sm font-bold text-violet-600">
                    {typeof f.pro === "boolean" ? (f.pro ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-[#d0d5ca] mx-auto" />) : f.pro}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Section */}
          {(isFree || isCanceled) && (
            <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1c1f1a]">Upgrade to Pro</h2>
                  <p className="text-[11px] text-[#9aa094]">Choose a plan that works for you</p>
                </div>
              </div>
              <div className="p-5 space-y-6">

                {/* Plan Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map(p => {
                    const isSelected = selectedPlan === p.id;
                    const isBest = p.badge === 'Best Value';
                    return (
                      <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                        className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50 shadow-sm'
                            : 'border-[#e2e6dc] hover:border-violet-200 bg-[#f8faf6]'
                        }`}>
                        {p.badge && (
                          <span className={`absolute -top-2.5 left-3 px-2.5 py-0.5 text-[10px] font-bold rounded-full shadow-sm ${
                            isBest ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white' : 'bg-amber-100 text-amber-700'
                          }`}>{p.badge}</span>
                        )}
                        <p className="text-sm font-bold text-[#1c1f1a]">{p.label}</p>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-[#1c1f1a]">Rs. {p.price}</span>
                        </div>
                        <p className="text-xs text-[#9aa094] mt-1">Rs. {p.perMonth}/month</p>
                        {p.savings && <p className="text-xs font-semibold text-emerald-600 mt-1">{p.savings}</p>}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Billing Summary */}
                <div className="bg-[#f8faf6] rounded-xl p-5 border border-[#e2e6dc]">
                  <h4 className="text-sm font-bold text-[#1c1f1a] mb-3">Billing Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#9aa094]">Plan</span><span className="font-medium text-[#1c1f1a]">Pro — {plan.label}</span></div>
                    <div className="flex justify-between"><span className="text-[#9aa094]">Duration</span><span className="font-medium text-[#1c1f1a]">{plan.duration}</span></div>
                    {plan.savings && <div className="flex justify-between"><span className="text-[#9aa094]">Discount</span><span className="font-medium text-emerald-600">-{plan.savings.replace('Save ', '')}</span></div>}
                    <div className="border-t border-[#e2e6dc] pt-2 mt-2 flex justify-between">
                      <span className="font-bold text-[#1c1f1a]">Total</span>
                      <span className="font-bold text-[#1c1f1a] text-lg">Rs. {plan.price}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h4 className="text-sm font-bold text-[#1c1f1a] mb-3">Payment Method</h4>
                  <div className="flex items-center gap-3 p-4 border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-[#e2e6dc]">
                      <img src="https://cdn.esewa.com.np/ui/images/logos/esewa-icon-large.png" alt="eSewa" className="w-8 h-8 object-contain"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://cdn.esewa.com.np/ui/images/esewa_og.png"; }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1c1f1a]">eSewa</p>
                      <p className="text-xs text-[#9aa094]">Pay securely with your eSewa wallet</p>
                    </div>
                    <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Pay Button */}
                <button onClick={handleUpgrade} disabled={upgrading}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20">
                  {upgrading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to eSewa...</>) : (<><CreditCard className="w-4 h-4" /> Pay Rs. {plan.price} with eSewa</>)}
                </button>
                {message && message.type === "error" && (
                  <div className="p-3 rounded-xl border text-sm bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
                    <X className="w-4 h-4 flex-shrink-0" />{message.text}
                  </div>
                )}
                <p className="text-xs text-[#9aa094] text-center">You'll be redirected to eSewa to complete payment. Pro access starts immediately.</p>
              </div>
            </div>
          )}

          {/* Billing History */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1c1f1a]">Billing History</h2>
                <p className="text-[11px] text-[#9aa094]">Your payments and rewards</p>
              </div>
            </div>
            <div className="p-5">
              {billingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-[#f8faf6] rounded-xl">
                      <div className="w-10 h-10 bg-[#e8ece3] rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-[#e8ece3] rounded" />
                        <div className="h-3 w-24 bg-[#e8ece3] rounded" />
                      </div>
                      <div className="h-4 w-20 bg-[#e8ece3] rounded" />
                    </div>
                  ))}
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No billing history</h3>
                  <p className="text-sm text-[#9aa094]">Purchases and rewards will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billingHistory.map(item => {
                    const isReward = item.type === 'reward';
                    const statusColors = {
                      COMPLETE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                      FAILED: 'bg-red-50 text-red-700 border-red-200',
                      CANCELED: 'bg-gray-100 text-gray-500 border-gray-200',
                    };
                    const medals = { 1: <Crown className="w-5 h-5 text-amber-500" />, 2: <Star className="w-5 h-5 text-gray-400" />, 3: <Star className="w-5 h-5 text-orange-500" /> };

                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-[#f8faf6] rounded-xl hover:bg-[#f0f2eb] transition-colors border border-transparent hover:border-[#e2e6dc]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isReward ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                          {isReward ? (medals[item.rank] || <Gift className="w-5 h-5 text-amber-500" />) : <CreditCard className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#1c1f1a] truncate">{item.label}</p>
                            {isReward && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 flex-shrink-0">
                                <Gift className="w-3 h-3" /> Reward
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-[#9aa094]">{fmtDate(item.date)}</p>
                            <span className="text-[#d0d5ca]">·</span>
                            <p className="text-xs text-[#9aa094]">{item.method}</p>
                            {item.transactionId && (
                              <>
                                <span className="text-[#d0d5ca]">·</span>
                                <p className="text-[10px] text-[#9aa094] font-mono truncate max-w-[120px]">{item.transactionId}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isReward ? (
                            <p className="text-sm font-bold text-amber-600">Free</p>
                          ) : (
                            <p className="text-sm font-bold text-[#1c1f1a]">Rs. {item.amount}</p>
                          )}
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[item.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
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

        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cancel Pro?</h3>
                  <p className="text-white/70 text-xs">You'll lose Pro features</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#565c52] mb-1">Pro access continues until your billing period ends.</p>
              <p className="text-sm text-[#565c52] mb-4">Type <span className="font-mono font-bold text-[#1c1f1a] bg-[#f4f7f2] px-1.5 py-0.5 rounded">CONFIRM</span> to cancel.</p>
              <input type="text" value={cancelConfirmInput} onChange={(e) => setCancelConfirmInput(e.target.value)}
                placeholder="Type CONFIRM" autoComplete="off"
                className="w-full px-4 py-3 border-2 border-[#e2e6dc] rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/15 font-mono text-sm mb-4 transition-all" />
              <div className="flex gap-3">
                <button onClick={() => { setShowCancelModal(false); setCancelConfirmInput(""); }}
                  className="flex-1 py-3 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">Keep Plan</button>
                <button onClick={confirmCancel} disabled={cancelConfirmInput !== "CONFIRM" || canceling}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {canceling ? "Canceling..." : "Cancel Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}