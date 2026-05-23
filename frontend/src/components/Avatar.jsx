import { useState, useEffect } from "react";
import { useCustomAvatar } from "../context/AvatarContext";

/**
 * Golden crown SVG for pro users
 */
function CrownBadge({ size }) {
  const crownSizes = {
    sm: "w-4 h-4 -top-1.5 -right-1.5",
    md: "w-[18px] h-[18px] -top-1.5 -right-1.5",
    lg: "w-5 h-5 -top-2 -right-1.5",
    xl: "w-6 h-6 -top-2 -right-1.5",
  };
  const crownClass = crownSizes[size] || crownSizes.md;

  return (
    <span className={`absolute ${crownClass} z-10 rounded-full bg-amber-400 border-2 border-white shadow-sm flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" className="w-[78%] h-[78%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 17L3.5 9L7.5 12L12 5L16.5 12L20.5 9L22 17H2Z"
          fill="#FFD700"
          stroke="#DAA520"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="3.5" cy="8" r="1.5" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
        <circle cx="12" cy="4" r="1.5" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
        <circle cx="20.5" cy="8" r="1.5" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
        <rect x="2" y="17" width="20" height="3" rx="1" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
      </svg>
    </span>
  );
}

/**
 * Avatar component that displays custom avatar, user photo, or initials fallback.
 * Priority: customAvatar > photoURL > initials
 * Pro users get a golden crown badge overlay.
 */
export function Avatar({ 
  photoURL, 
  displayName, 
  email, 
  size = "md",
  className = "",
  isPro = false,
}) {
  const [imageError, setImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { avatarUrl } = useCustomAvatar();

  // Reset error state when photoURL changes
  useEffect(() => {
    setImageError(false);
    setIsImageLoaded(false);
  }, [photoURL, avatarUrl]);

  const getInitials = () => {
    if (displayName) {
      const names = displayName.trim().split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-20 h-20 text-2xl",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const initials = getInitials();

  // Show custom avatar if set
  if (avatarUrl) {
    return (
      <div className={`relative inline-block flex-shrink-0 ${className}`}>
        <img
          src={avatarUrl}
          alt={displayName || "User avatar"}
          className={`${sizeClass} rounded-full object-cover`}
          loading="lazy"
        />
        {isPro && <CrownBadge size={size} />}
      </div>
    );
  }

  // Show photo if available and no error
  if (photoURL && !imageError) {
    return (
      <div className={`relative inline-block flex-shrink-0 ${className}`}>
        <div className={`relative ${sizeClass} rounded-full overflow-hidden ring-2 ring-white bg-site-accent text-white flex items-center justify-center font-semibold`}>
          <span className={`${isImageLoaded ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}>
            {initials}
          </span>
          <img
            src={photoURL}
            alt={displayName || "User avatar"}
            onError={() => {
              setImageError(true);
              setIsImageLoaded(false);
            }}
            onLoad={() => setIsImageLoaded(true)}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover rounded-full ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            } transition-opacity duration-200`}
            loading="lazy"
          />
        </div>
        {isPro && <CrownBadge size={size} />}
      </div>
    );
  }

  // Fallback to initials
  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClass} rounded-full bg-site-accent text-white flex items-center justify-center font-semibold ring-2 ring-white`}
      >
        {getInitials()}
      </div>
      {isPro && <CrownBadge size={size} />}
    </div>
  );
}
