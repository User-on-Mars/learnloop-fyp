import { useState, useEffect } from "react";

/**
 * Avatar component that displays user photo or initials fallback
 * Handles image loading errors gracefully
 */
export function Avatar({ 
  photoURL, 
  displayName, 
  email, 
  size = "md",
  className = "" 
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!photoURL);

  // Reset error state when photoURL changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(!!photoURL);
  }, [photoURL]);

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

  // Show photo if available and no error
  if (photoURL && !imageError) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <img
          src={photoURL}
          alt={displayName || "User avatar"}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          className={`${sizeClass} rounded-full object-cover ring-2 ring-white ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-200`}
        />
        {/* Loading skeleton */}
        {isLoading && (
          <div
            className={`${sizeClass} rounded-full bg-site-accent/20 absolute inset-0 animate-pulse`}
          />
        )}
      </div>
    );
  }

  // Fallback to initials
  return (
    <div
      className={`${sizeClass} rounded-full bg-site-accent text-white flex items-center justify-center font-semibold flex-shrink-0 ring-2 ring-white ${className}`}
    >
      {getInitials()}
    </div>
  );
}
