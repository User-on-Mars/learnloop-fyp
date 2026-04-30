import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { subscriptionAPI } from "../api/client";
import { useAuth } from "../useAuth";

const SubscriptionContext = createContext(null);

const DEFAULT_FREE = {
  tier: "free",
  status: "active",
  limits: {
    maxSkillMaps: 3,
    maxNodesPerSkillMap: 5,
    maxSessionsPerNode: 5,
    maxRooms: 1,
    maxRoomMembers: 3,
    canExportPdf: false,
  },
  usage: { skillMaps: 0, rooms: 0 },
  currentPeriodEnd: null,
  canceledAt: null,
};

export function SubscriptionProvider({ children }) {
  const user = useAuth();
  const [subscription, setSubscription] = useState(DEFAULT_FREE);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(DEFAULT_FREE);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await subscriptionAPI.getInfo();
      setSubscription(res.data);
    } catch (err) {
      console.warn("Failed to fetch subscription, defaulting to free:", err.message);
      setSubscription(DEFAULT_FREE);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // The backend's `tier` field already accounts for canceled-but-still-in-period
  const isPro = subscription.tier === "pro";
  const isCanceled = !!subscription.canceledAt;
  const isFree = !isPro;
  const isRewarded = subscription.source === "reward";

  /**
   * Initiate eSewa payment flow.
   * Returns { paymentUrl, formData } — the frontend should POST formData to paymentUrl.
   */
  const initiatePayment = async (planId = 'pro_1month') => {
    const res = await subscriptionAPI.esewaInitiate(planId);
    return res.data;
  };

  /**
   * Verify eSewa payment after redirect.
   * @param {string} encodedData - base64-encoded data from eSewa success redirect
   */
  const verifyPayment = async (encodedData) => {
    const res = await subscriptionAPI.esewaVerify(encodedData);
    if (res.data.subscription) {
      setSubscription(res.data.subscription);
    }
    return res.data;
  };

  const cancel = async () => {
    const res = await subscriptionAPI.cancel();
    setSubscription(res.data);
    return res.data;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        isPro,
        isFree,
        isCanceled,
        isRewarded,
        tier: subscription.tier,
        limits: subscription.limits,
        usage: subscription.usage,
        initiatePayment,
        verifyPayment,
        cancel,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
