import { Loader2 } from 'lucide-react';

const LoadingButton = ({ 
  isLoading = false, 
  disabled = false, 
  children, 
  loadingText = "Loading...",
  className = "",
  variant = "primary",
  ...props 
}) => {
  const getVariantStyles = () => {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-site-accent text-white hover:bg-site-accent-hover disabled:hover:bg-site-accent`;
      case 'secondary':
        return `${baseStyles} border border-site-border bg-site-surface text-site-ink hover:bg-site-bg disabled:hover:bg-site-surface`;
      case 'danger':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600`;
      default:
        return baseStyles;
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${getVariantStyles()} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
};

export default LoadingButton;