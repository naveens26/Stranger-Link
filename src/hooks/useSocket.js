import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Generate or get a unique fingerprint for each user
const getFingerprint = () => {
  let fingerprint = localStorage.getItem('chat_fingerprint');
  
  if (!fingerprint) {
    fingerprint = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_fingerprint', fingerprint);
  }
  
  return fingerprint;
};

const fingerprint = getFingerprint();

// Create socket connection with MAXIMUM persistence
const createSocket = () => {
  const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    auth: {
      fingerprint: fingerprint
    },
    query: {
      fingerprint: fingerprint,
      persistent: 'true', // Mark as persistent connection
      connectTime: Date.now()
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 60000, // 60 second timeout
    autoConnect: true,
    forceNew: false,
    // Match server NO-DISCONNECT settings
    pingTimeout: 60000,
    pingInterval: 30000,
    // Add these for maximum persistence
    closeOnBeforeunload: false, // Don't close on page refresh
    withCredentials: false,
    extraHeaders: {
      'X-Connection-Type': 'persistent'
    }
  });

  return socket;
};

// Global socket instance
let socketInstance = null;

const getSocketInstance = () => {
  if (!socketInstance) {
    socketInstance = createSocket();
    console.log('[Socket] Created PERSISTENT connection instance');
  }
  return socketInstance;
};

export const useSocket = (callbacks) => {
  const { 
    onPartnerFound, 
    onReceiveMessage, 
    onPartnerTyping, 
    onPartnerDisconnected,
    onWaiting,
    onError,
    onConnect,
    onDisconnect
  } = callbacks || {};

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    console.log('[Socket] Initializing PERSISTENT connection');
    
    const socket = getSocketInstance();

    // CONNECTION EVENTS
    const handleConnect = () => {
      if (!isMounted.current) return;
      console.log('[Socket] ✅ Connected. ID:', socket.id);
      
      // Send connection confirmation
      socket.emit('heartbeat', { 
        fingerprint: fingerprint,
        action: 'connected',
        timestamp: Date.now() 
      });
      
      if (onConnect) onConnect();
    };

    const handleDisconnect = (reason) => {
      if (!isMounted.current) return;
      console.log('[Socket] ❌ Disconnected. Reason:', reason);
      
      // Only callback, NO auto-reconnect (Socket.io handles it)
      if (onDisconnect) onDisconnect(reason);
    };

    // APPLICATION EVENTS
    const handlePartnerFound = (data) => {
      if (!isMounted.current) return;
      if (onPartnerFound) onPartnerFound(data);
    };

    const handleReceiveMessage = (message) => {
      if (!isMounted.current) return;
      if (onReceiveMessage) onReceiveMessage(message);
    };

    const handlePartnerTyping = (isTyping) => {
      if (!isMounted.current) return;
      if (onPartnerTyping) onPartnerTyping(isTyping);
    };

    const handlePartnerDisconnected = () => {
      if (!isMounted.current) return;
      if (onPartnerDisconnected) onPartnerDisconnected();
    };

    const handleWaiting = (message) => {
      if (!isMounted.current) return;
      if (onWaiting) onWaiting(message);
    };

    const handleError = (error) => {
      if (!isMounted.current) return;
      console.log('[Socket] ⚠️ Error:', error);
      if (onError) onError(error);
    };

    // SETUP LISTENERS
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('partner_found', handlePartnerFound);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('partner_disconnected', handlePartnerDisconnected);
    socket.on('waiting', handleWaiting);
    socket.on('error', handleError);
    
    // Server shutdown event
    socket.on('server_shutdown', () => {
      console.log('[Socket] 🛑 Server is shutting down');
      alert('Server maintenance. Reconnecting automatically...');
    });

    // Optional: Send periodic "I'm alive" signals (every 60 seconds)
    const keepAliveInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { 
          fingerprint: fingerprint,
          action: 'keepalive',
          timestamp: Date.now() 
        });
        console.log('[Socket] 💓 Keepalive sent');
      }
    }, 60000); // Every 60 seconds

    // Setup beforeunload handler to prevent accidental disconnects
    const handleBeforeUnload = (event) => {
      // Don't prevent default, just notify
      console.log('[Socket] Page unloading - connection may persist');
      // Optionally send a disconnect notice
      if (socket.connected) {
        navigator.sendBeacon && navigator.sendBeacon(
          `${import.meta.env.VITE_SOCKET_URL || window.location.origin}/disconnect-notice`,
          JSON.stringify({ fingerprint })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Force connection if not already connected
    if (!socket.connected) {
      console.log('[Socket] 🔄 Not connected, attempting to connect...');
      socket.connect();
    }

    // Cleanup
    return () => {
      isMounted.current = false;
      console.log('[Socket] 🧹 Component cleanup - keeping connection alive');
      
      // Clear interval
      clearInterval(keepAliveInterval);
      
      // Remove window listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Remove ONLY component-specific listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('partner_found', handlePartnerFound);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('partner_disconnected', handlePartnerDisconnected);
      socket.off('waiting', handleWaiting);
      socket.off('error', handleError);
      socket.off('server_shutdown');
      
      // IMPORTANT: DON'T disconnect the socket!
      // The socket stays alive for other components/pages
    };
  }, [
    onPartnerFound, onReceiveMessage, onPartnerTyping, onPartnerDisconnected, 
    onWaiting, onError, onConnect, onDisconnect
  ]);

  const emit = useCallback((event, data) => {
    const socket = getSocketInstance();
    console.log(`[Socket] 📤 Emitting ${event}:`, data);
    socket.emit(event, data);
  }, []);

  // Manual disconnect (only use when user explicitly wants to disconnect)
  const manualDisconnect = useCallback(() => {
    const socket = getSocketInstance();
    console.log('[Socket] 🚫 Manual disconnect requested by user');
    socket.disconnect();
  }, []);

  // Manual connect
  const manualConnect = useCallback(() => {
    const socket = getSocketInstance();
    console.log('[Socket] 🔌 Manual connect requested');
    socket.connect();
  }, []);

  const getFingerprint = useCallback(() => {
    return fingerprint;
  }, []);

  const getSocketStatus = useCallback(() => {
    const socket = getSocketInstance();
    return {
      connected: socket.connected,
      id: socket.id,
      fingerprint: fingerprint,
      persistent: true
    };
  }, []);

  return { 
    socket: getSocketInstance(), 
    emit, 
    getFingerprint,
    getSocketStatus,
    manualDisconnect,
    manualConnect
  };
};

export const genderUtils = {
  getGenderIcon: (gender) => {
    switch(gender) {
      case 'male': return '♂️';
      case 'female': return '♀️';
      default: return '👤';
    }
  },

  getGenderColor: (gender) => {
    switch(gender) {
      case 'male': return 'text-blue-400';
      case 'female': return 'text-pink-400';
      default: return 'text-slate-400';
    }
  },

  getGenderBgColor: (gender) => {
    switch(gender) {
      case 'male': return 'bg-blue-900/30 border-blue-500/30';
      case 'female': return 'bg-pink-900/30 border-pink-500/30';
      default: return 'bg-slate-800';
    }
  },

  getBgColorClass: (gender) => {
    switch(gender) {
      case 'male': return 'bg-blue-500';
      case 'female': return 'bg-pink-500';
      default: return 'bg-slate-400';
    }
  }
};