import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, RefreshCw, Wifi, WifiOff, CheckCircle, Info } from 'lucide-react';

/**
 * Enhanced Error Notification System
 * 
 * Implements Requirements: 8.1, 8.3, 8.5
 * 
 * Features:
 * - Multiple notification types (error, warning, info, success)
 * - Auto-dismiss with configurable timeout
 * - Retry actions for recoverable errors
 * - Network status monitoring
 * - Animation fallback notifications
 * - User-friendly error messages
 */

const ErrorNotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'Your internet connection has been restored.',
        duration: 3000
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addNotification({
        type: 'error',
        title: 'Connection Lost',
        message: 'You are currently offline. Some features may not work properly.',
        persistent: true,
        id: 'offline-notification'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Global error handler
  useEffect(() => {
    const handleGlobalError = (event) => {
      addNotification({
        type: 'error',
        title: 'Unexpected Error',
        message: 'An unexpected error occurred. The page may need to be refreshed.',
        actions: [
          {
            label: 'Refresh Page',
            action: () => window.location.reload(),
            primary: true
          }
        ]
      });
    };
    
    const handleUnhandledRejection = (event) => {
      addNotification({
        type: 'error',
        title: 'Operation Failed',
        message: 'A background operation failed. Please try again.',
        actions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            primary: true
          }
        ]
      });
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const addNotification = useCallback((notification) => {
    const id = notification.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };
    
    setNotifications(prev => {
      // Remove existing notification with same ID
      const filtered = prev.filter(n => n.id !== id);
      return [...filtered, newNotification];
    });
    
    // Auto-dismiss if not persistent
    if (!notification.persistent) {
      const duration = notification.duration || (notification.type === 'error' ? 8000 : 5000);
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);
  
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Expose methods globally for use by other components
  useEffect(() => {
    window.showErrorNotification = (error, options = {}) => {
      addNotification({
        type: 'error',
        title: options.title || 'Error',
        message: error.userFriendly || error.message || 'An error occurred',
        actions: error.recoveryActions?.map(action => ({
          label: action.label || action.description,
          action: action.action || (() => {}),
          primary: action.priority === 'high'
        })),
        ...options
      });
    };
    
    window.showSuccessNotification = (message, options = {}) => {
      addNotification({
        type: 'success',
        title: options.title || 'Success',
        message,
        ...options
      });
    };
    
    window.showWarningNotification = (message, options = {}) => {
      addNotification({
        type: 'warning',
        title: options.title || 'Warning',
        message,
        ...options
      });
    };
    
    window.showInfoNotification = (message, options = {}) => {
      addNotification({
        type: 'info',
        title: options.title || 'Information',
        message,
        ...options
      });
    };
    
    window.showAnimationFallbackNotification = (nodeId, animationType) => {
      addNotification({
        type: 'warning',
        title: 'Animation Simplified',
        message: 'Visual effects have been simplified due to technical limitations.',
        duration: 3000
      });
    };
    
    return () => {
      delete window.showErrorNotification;
      delete window.showSuccessNotification;
      delete window.showWarningNotification;
      delete window.showInfoNotification;
      delete window.showAnimationFallbackNotification;
    };
  }, [addNotification]);
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };
  
  const getNotificationStyles = (type) => {
    const baseStyles = "border-l-4 shadow-lg rounded-r-lg";
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-800`;
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 text-gray-800`;
    }
  };
  
  const getIconStyles = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  /** Solid fill for primary actions — avoid bg-current with text-white (both resolve to white). */
  const getPrimaryActionStyles = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'warning':
        return 'bg-amber-600 text-white hover:bg-amber-700';
      case 'info':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      default:
        return 'bg-gray-700 text-white hover:bg-gray-800';
    }
  };
  
  if (notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2 text-sm text-red-800">
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
        </div>
      )}
      
      {/* Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyles(notification.type)} p-4 animate-slide-in-right`}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 ${getIconStyles(notification.type)}`}>
              {getNotificationIcon(notification.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {notification.title && (
                <h4 className="font-semibold text-sm mb-1">
                  {notification.title}
                </h4>
              )}
              <p className="text-sm opacity-90">
                {notification.message}
              </p>
              
              {/* Actions */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        if (action.dismissOnClick !== false) {
                          removeNotification(notification.id);
                        }
                      }}
                      className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                        action.primary
                          ? getPrimaryActionStyles(notification.type)
                          : 'border border-current hover:bg-current hover:text-white'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      
      {/* Clear All Button */}
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={clearAllNotifications}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

// CSS for animations (add to your global CSS)
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ErrorNotificationSystem;