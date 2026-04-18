import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';

const Toast = ({ 
  id,
  type = 'error', 
  title, 
  message, 
  duration = 5000,
  showRetry = false,
  onRetry,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 300);
  };

  const handleRetry = () => {
    onRetry?.();
    handleClose();
  };

  if (!isVisible) return null;

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200', 
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800', 
      icon: AlertCircle,
      iconColor: 'text-amber-600'
    }
  };

  const style = typeStyles[type] || typeStyles.error;
  const Icon = style.icon;

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full
        ${style.bg} ${style.border} ${style.text}
        border rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm mb-1">{title}</p>
          )}
          {message && (
            <p className="text-sm">{message}</p>
          )}
          
          {showRetry && onRetry && (
            <button
              onClick={handleRetry}
              className={`
                mt-2 inline-flex items-center gap-1 text-xs font-medium
                hover:underline focus:outline-none focus:underline
                ${style.text}
              `}
            >
              <RefreshCw className="w-3 h-3" />
              Try Again
            </button>
          )}
        </div>

        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 p-1 rounded-md hover:bg-black/5 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
            ${style.text}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;