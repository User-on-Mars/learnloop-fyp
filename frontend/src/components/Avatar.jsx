import { useState, useEffect } from "react";
import { useCustomAvatar } from "../context/AvatarContext";

function getProAuraClass(isPro) {
  return isPro
    ? "ring-[3px] ring-amber-300 shadow-[0_0_0_3px_rgba(255,255,255,0.95),0_0_18px_rgba(245,158,11,0.58)]"
    : "ring-2 ring-white";
}

/**
 * Avatar component that displays custom avatar, user photo, or initials fallback.
 * Priority: customAvatar > photoURL > initials
 * Pro users get a gold aura around the avatar.
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
  const auraClass = getProAuraClass(isPro);

  // Show custom avatar if set
  if (avatarUrl) {
    return (
      <div className={`relative inline-block flex-shrink-0 ${className}`}>
        <img
          src={avatarUrl}
          alt={displayName || "User avatar"}
          className={`${sizeClass} rounded-full object-cover ${auraClass}`}
          loading="lazy"
        />
      </div>
    );
  }

  // Show photo if available and no error
  if (photoURL && !imageError) {
    return (
      <div className={`relative inline-block flex-shrink-0 ${className}`}>
        <div className={`relative ${sizeClass} rounded-full overflow-hidden ${auraClass} bg-site-accent text-white flex items-center justify-center font-semibold`}>
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
      </div>
    );
  }

  // Fallback to initials
  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClass} rounded-full bg-site-accent text-white flex items-center justify-center font-semibold ${auraClass}`}
      >
        {getInitials()}
      </div>
    </div>
  );
}
