import React from 'react';
import { RefreshCw, AlertTriangle, Home, ArrowLeft, Settings, Bug } from 'lucide-react';
import ErrorHandlingService from '../services/ErrorHandlingService';

/**
 * Enhanced Error Boundary with comprehensive error handling and recovery
 * 
 * Implements Requirements: 8.1, 8.3, 8.5
 * 
 * Features:
 * - Multiple recovery strategies
 * - Detailed error reporting in development
 * - User-friendly error messages
 * - Automatic retry with exponential backoff
 * - Error categorization and appropriate responses
 */
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorCategory: null,
      recoveryOptions: null,
      showDetails: false
    };
    
    // Bind methods
    this.handleRefresh = this.handleRefresh.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleGoBack = this.handleGoBack.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
    this.handleReportError = this.handleReportError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by EnhancedErrorBoundary:', error, errorInfo);
    
    // Create enhanced error with recovery options
    const enhancedError = ErrorHandlingService.createUserFriendlyError(error, {
      component: this.props.componentName || 'Unknown',
      errorBoundary: true,
      retryCount: this.state.retryCount,
      props: this.props
    });
    
    // Get recovery guidance
    const recoveryOptions = ErrorHandlingService.createRecoveryGuidance(enhancedError, {
      componentName: this.props.componentName,
      canRetry: this.props.allowRetry !== false,
      canRefresh: this.props.allowRefresh !== false
    });
    
    this.setState({
      error: enhancedError,
      errorInfo,
      errorCategory: enhancedError.category,
      recoveryOptions
    });
    
    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production' && this.props.onError) {
      this.props.onError(error, errorInfo, enhancedError);
    }
  }

  handleRefresh() {
    this.setState({ isRetrying: true });
    
    // Small delay to show loading state
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  handleReset() {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      retryCount: this.state.retryCount + 1,
      isRetrying: false,
      showDetails: false
    });
  }

  async handleRetry() {
    if (this.state.retryCount >= 3) {
      this.handleRefresh();
      return;
    }

    this.setState({ isRetrying: true });
    
    try {
      // Use exponential backoff for retry delay
      const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // If component has a retry method, call it
      if (this.props.onRetry) {
        await this.props.onRetry();
      }
      
      this.handleReset();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ 
        isRetrying: false,
        retryCount: this.state.retryCount + 1
      });
    }
  }

  handleGoHome() {
    window.location.href = '/';
  }

  handleGoBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.handleGoHome();
    }
  }

  toggleDetails() {
    this.setState({ showDetails: !this.state.showDetails });
  }

  handleReportError() {
    const errorReport = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      componentName: this.props.componentName
    };
    
    // In production, this would send to error reporting service
    console.log('Error Report:', errorReport);
    
    // Copy to clipboard for user to send manually
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please send this to support.');
      })
      .catch(() => {
        alert('Unable to copy error details. Please take a screenshot and contact support.');
      });
  }

  renderErrorIcon() {
    const { errorCategory } = this.state;
    
    switch (errorCategory) {
      case 'animation':
        return <Settings className="w-8 h-8 text-yellow-600" />;
      case 'network':
        return <RefreshCw className="w-8 h-8 text-blue-600" />;
      case 'authentication':
        return <AlertTriangle className="w-8 h-8 text-orange-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
  }

  renderRecoveryActions() {
    const { recoveryOptions, retryCount, isRetrying } = this.state;
    const canRetry = retryCount < 3 && this.props.allowRetry !== false;
    
    return (
      <div className="flex flex-col gap-3">
        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && (
            <button
              onClick={this.handleRetry}
              disabled={isRetrying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-site-accent text-white rounded-lg hover:bg-site-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </>
              )}
            </button>
          )}
          
          {this.props.allowRefresh !== false && (
            <button
              onClick={this.handleRefresh}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={this.handleGoBack}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <button
            onClick={this.handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {/* Recovery Guidance */}
        {recoveryOptions && recoveryOptions.canRecover && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Recovery Suggestions:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              {recoveryOptions.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {action.description}
                </li>
              ))}
            </ul>
            {recoveryOptions.estimatedRecoveryTime && (
              <p className="text-xs text-blue-600 mt-2">
                Estimated recovery time: {recoveryOptions.estimatedRecoveryTime} seconds
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  renderErrorDetails() {
    const { error, errorInfo, showDetails } = this.state;
    
    if (!showDetails || process.env.NODE_ENV !== 'development') {
      return null;
    }
    
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
        
        {/* Error Message */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Message:</h4>
          <p className="text-sm text-gray-600 font-mono break-all bg-white p-2 rounded border">
            {error?.message || 'Unknown error'}
          </p>
        </div>
        
        {/* Error Code */}
        {error?.code && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Code:</h4>
            <p className="text-sm text-gray-600 font-mono bg-white p-2 rounded border">
              {error.code}
            </p>
          </div>
        )}
        
        {/* Component Stack */}
        {errorInfo?.componentStack && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Component Stack:</h4>
            <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}
        
        {/* Error Context */}
        {error?.context && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Context:</h4>
            <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(error.context, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
              {this.renderErrorIcon()}
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error?.userFriendly || errorMessage}
            </p>

            {/* Retry Information */}
            {retryCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  Retry attempt {retryCount} of 3
                </p>
              </div>
            )}
            
            {/* Recovery Actions */}
            {this.renderRecoveryActions()}
            
            {/* Error Details Toggle */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6">
                <button
                  onClick={this.toggleDetails}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                </button>
              </div>
            )}
            
            {/* Error Details */}
            {this.renderErrorDetails()}
            
            {/* Report Error Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={this.handleReportError}
                className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto"
              >
                <Bug className="w-4 h-4" />
                Report Error
              </button>
            </div>
            
            {/* Help Text */}
            <p className="text-sm text-gray-500 mt-4">
              {retryCount >= 3 ? 
                'If the problem persists after refreshing, please contact support.' :
                'If the problem continues, try refreshing the page or contact support.'
              }
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;