import { useState } from "react";
import { Sparkles, X, Crown, Check } from "lucide-react";
import { useSubscription } from "../context/SubscriptionContext";

/**
 * Inline upgrade prompt shown when a user hits a free-tier limit.
 * Props:
 *   feature  - human-readable feature name ("skill maps", "rooms", etc.)
 *   current  - current usage count
 *   max      - limit on free tier
 *   onClose  - optional callback to dismiss
 */
export function UpgradeBanner({ feature, current, max, onClose }) {
  return (
    <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">
            You've reached the limit of {max} {feature}
          </p>
          <p className="text-amber-700 text-xs mt-1">
            Upgrade to Pro for unlimited access and premium features.
          </p>
          <a
            href="/subscription"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Small badge that shows the user's current tier.
 */
export function TierBadge() {
  const { tier, isPro } = useSubscription();

  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
        <Crown className="w-3 h-3" />
        PRO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
      FREE
    </span>
  );
}

/**
 * Pro feature lock overlay.
 * Wraps a feature section and shows an upgrade prompt if user is on free tier.
 */
export function ProFeatureGate({ children, feature = "this feature" }) {
  const { isFree } = useSubscription();

  if (!isFree) return children;

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl">
        <div className="text-center p-4">
          <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Pro Feature</p>
          <p className="text-gray-500 text-xs mt-1">
            Upgrade to unlock {feature}
          </p>
          <a
            href="/subscription"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
