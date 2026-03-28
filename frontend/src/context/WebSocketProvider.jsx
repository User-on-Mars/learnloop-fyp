/**
 * WebSocket Provider
 * 
 * Provides WebSocket context and manages connection lifecycle
 * for the entire application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import useWebSocket from '../hooks/useWebSocket';

const WebSocketContext = createContext(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const user = useAuth();
  const [connectionHistory, setConnectionHistory] = useState([]);
  
  const webSocket = useWebSocket({
    serverUrl: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000',
    autoReconnect: true,
    reconnectInterval: 5000
  });

  // Track connection history for debugging
  useEffect(() => {
    const handleConnectionChange = (status) => {
      setConnectionHistory(prev => [
        ...prev.slice(-9), // Keep last 10 entries
        {
          status,
          timestamp: new Date().toISOString(),
          user: user?.email || 'anonymous'
        }
      ]);
    };

    if (webSocket.connectionStatus) {
      handleConnectionChange(webSocket.connectionStatus);
    }
  }, [webSocket.connectionStatus, user?.email]);

  // Auto-connect when user is available
  useEffect(() => {
    if (user?.token && !webSocket.isConnected && webSocket.connectionStatus === 'disconnected') {
      console.log('🔌 Auto-connecting WebSocket for user:', user.email);
      webSocket.connect(user.token).catch(error => {
        console.error('❌ Auto-connect failed:', error);
      });
    }
  }, [user?.token, webSocket.isConnected, webSocket.connectionStatus, webSocket.connect]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!user && webSocket.isConnected) {
      console.log('🔌 Disconnecting WebSocket - user logged out');
      webSocket.disconnect();
    }
  }, [user, webSocket.isConnected, webSocket.disconnect]);

  const contextValue = {
    ...webSocket,
    connectionHistory,
    
    // Enhanced methods
    connectWithRetry: async (maxRetries = 3) => {
      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          await webSocket.connect(user?.token);
          return true;
        } catch (error) {
          attempts++;
          console.warn(`WebSocket connection attempt ${attempts}/${maxRetries} failed:`, error);
          
          if (attempts < maxRetries) {
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      return false;
    },

    getConnectionInfo: () => ({
      isConnected: webSocket.isConnected,
      status: webSocket.connectionStatus,
      error: webSocket.connectionError,
      reconnectAttempts: webSocket.reconnectAttempts,
      currentSkillRoom: webSocket.currentSkillRoom,
      history: connectionHistory
    }),

    // Utility methods
    isHealthy: () => webSocket.isConnected && !webSocket.connectionError,
    
    getDebugInfo: () => ({
      ...webSocket.getStatus(),
      connectionHistory,
      user: user?.email || null,
      timestamp: new Date().toISOString()
    })
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;