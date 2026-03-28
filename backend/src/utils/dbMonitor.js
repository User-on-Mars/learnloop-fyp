/**
 * Database Monitoring Utility
 * Provides timeout handling and slow query logging for database operations
 */

const WRITE_TIMEOUT_MS = 1000;
const SLOW_QUERY_THRESHOLD_MS = 500;

class DatabaseMonitor {
  /**
   * Wrap a database operation with timeout and performance monitoring
   * @param {Function} operation - Async database operation to execute
   * @param {string} operationName - Name of the operation for logging
   * @param {number} timeoutMs - Timeout in milliseconds (default: 1000ms)
   * @returns {Promise<any>}
   */
  async monitorWrite(operation, operationName, timeoutMs = WRITE_TIMEOUT_MS) {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database write timeout: ${operationName} exceeded ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Race between operation and timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`[DB Monitor] Slow query detected: ${operationName} took ${duration}ms`, {
          operation: operationName,
          duration,
          threshold: SLOW_QUERY_THRESHOLD_MS,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[DB Monitor] Database operation failed: ${operationName}`, {
        operation: operationName,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Monitor a read operation (no timeout, only performance logging)
   * @param {Function} operation - Async database operation to execute
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise<any>}
   */
  async monitorRead(operation, operationName) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`[DB Monitor] Slow query detected: ${operationName} took ${duration}ms`, {
          operation: operationName,
          duration,
          threshold: SLOW_QUERY_THRESHOLD_MS,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[DB Monitor] Database operation failed: ${operationName}`, {
        operation: operationName,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }
}

export default new DatabaseMonitor();
