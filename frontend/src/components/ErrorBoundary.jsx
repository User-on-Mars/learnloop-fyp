import React from 'react';
import { RefreshCw, AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import ErrorHandlingService from '../services/ErrorHandlingService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Create user-friendly error with recovery actions
    const userFriendlyError = ErrorHandlingService.createUserFriendlyError(error, {
      component: this.props.componentName || 'Unknown',
      errorBoundary: true,
      retryCount: this.state.retryCount
    });
    
    this.setState({
      error: userFriendlyError,
      errorInfo
    });
  }

  handleRefresh = () => {
    // Reset error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
    window.location.reload();
  };

  handleReset = () => {
    // Just reset the error state without reloading
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      retryCount: this.state.retryCount + 1,
      isRetrying: false 
    });
  };

  handleRetry = async () => {
    if (this.state.retryCount >= 3) {
      // Max retries reached, suggest refresh
      this.handleRefresh();
      return;
    }

    this.setState({ isRetrying: true });
    
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.handleReset();
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  handleGoBack = () => {
    // Go back in browser history
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, isRetrying } = this.state;
      const canRetry = retryCount < 3;
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {errorMessage}
            </p>

            {/* Retry Information */}
            {retryCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  Retry attempt {retryCount} of 3
                </p>
              </div>
            )}
            
            {/* Error Details (in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
                <p className="text-sm text-gray-700 font-mono break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
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
                
                <button
                  onClick={this.handleRefresh}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
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

export default ErrorBoundary;