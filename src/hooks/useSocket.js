// hooks/useSocket.js
// hooks/useSocket.js
import { useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

// Generate or get a unique fingerprint for each user
const getFingerprint = () => {
  // Try to get from localStorage first
  let fingerprint = localStorage.getItem('chat_fingerprint');
  
  // If not found, generate a new one
  if (!fingerprint) {
    fingerprint = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_fingerprint', fingerprint);
  }
  
  return fingerprint;
};

const fingerprint = getFingerprint();

// Create socket connection with authentication
const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  auth: {
    fingerprint: fingerprint
  },
  query: {
    fingerprint: fingerprint
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
});

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

  useEffect(() => {
    console.log('Socket fingerprint:', fingerprint);
    
    // Connection events
    if (onConnect) {
      socket.on('connect', onConnect);
    }
    
    if (onDisconnect) {
      socket.on('disconnect', onDisconnect);
    }
    
    // Application events
    if (onPartnerFound) {
      socket.on('partner_found', onPartnerFound);
    }

    if (onReceiveMessage) {
      socket.on('receive_message', onReceiveMessage);
    }

    if (onPartnerTyping) {
      socket.on('partner_typing', onPartnerTyping);
    }

    if (onPartnerDisconnected) {
      socket.on('partner_disconnected', onPartnerDisconnected);
    }

    if (onWaiting) {
      socket.on('waiting', onWaiting);
    }

    if (onError) {
      socket.on('error', onError);
    }

    // Add server shutdown event
    socket.on('server_shutdown', () => {
      console.log('Server is shutting down');
      // Handle server shutdown
    });

    return () => {
      // Clean up all event listeners
      socket.off('connect');
      socket.off('disconnect');
      socket.off('partner_found');
      socket.off('receive_message');
      socket.off('partner_typing');
      socket.off('partner_disconnected');
      socket.off('waiting');
      socket.off('error');
      socket.off('server_shutdown');
    };
  }, [onPartnerFound, onReceiveMessage, onPartnerTyping, onPartnerDisconnected, onWaiting, onError, onConnect, onDisconnect]);

  const emit = useCallback((event, data) => {
    console.log(`Emitting ${event}:`, data);
    socket.emit(event, data);
  }, []);

  // Helper to get fingerprint
  const getFingerprint = useCallback(() => {
    return fingerprint;
  }, []);

  return { socket, emit, getFingerprint };
};

// ... rest of your genderUtils stays the same ...
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