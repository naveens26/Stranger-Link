// App.jsx - UPDATED VERSION with keyboard fixes
import { useEffect, useMemo, useRef, useState } from 'react';
import ChatInput from './components/ChatInput';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import HomeView from './components/HomeView';
import PartnerInfo from './components/PartnerInfo';
import SearchView from './components/SearchView';
import { useSocket } from './hooks/useSocket';
import './styles/animations.css';

export default function App() {
  // Generate a fingerprint once per session
  const fingerprint = useMemo(() => Math.random().toString(36).substring(7), []);

  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [notification, setNotification] = useState("");
  const [userData, setUserData] = useState({
    gender: "male",
    partnerGender: "any",
    showGender: false,
    username: ""
  });
  const [partnerInfo, setPartnerInfo] = useState({
    gender: null,
    username: 'Stranger',
    showGender: false
  });
  
  // Keyboard state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  
  const messagesEndRef = useRef();
  const chatContainerRef = useRef();
  const scrollTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Handle page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (room) {
        // Try to send disconnect before page unload
        emit('leave_chat', { room, fingerprint });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clean up on component unmount
      if (room) {
        emit('leave_chat', { room, fingerprint });
      }
    };
  }, [room]);

  // Fixed scrolling - only scroll when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  // Auto-hide typing indicator after 2 seconds
  useEffect(() => {
    let timer;
    if (isPartnerTyping) {
      timer = setTimeout(() => setIsPartnerTyping(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [isPartnerTyping]);

  // Visual viewport handling for keyboard detection
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (!window.visualViewport) return;
      
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const keyboardHeight = windowHeight - viewportHeight;
      
      // Keyboard is open if height difference > 100px
      const keyboardIsOpen = keyboardHeight > 100;
      
      if (keyboardIsOpen !== isKeyboardOpen) {
        setIsKeyboardOpen(keyboardIsOpen);
      }
      
      // Adjust chat container height for smooth transitions
      if (chatContainerRef.current) {
        chatContainerRef.current.style.transition = 'height 0.3s ease';
        chatContainerRef.current.style.height = `${viewportHeight}px`;
        
        // When keyboard closes, restore full height
        if (!keyboardIsOpen) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.style.height = '100%';
            }
          }, 350);
        }
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [isKeyboardOpen]);

  // Enable auto-focus only after user interaction
  useEffect(() => {
    if (room && inputRef.current && shouldAutoFocus) {
      // Don't auto-focus on connection, wait for user tap
      const handleFirstTap = (e) => {
        // Only focus if tap is not on the input itself
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
          // Remove listener after first tap
          document.removeEventListener('click', handleFirstTap);
        }
      };
      
      // Add event listener for first interaction
      document.addEventListener('click', handleFirstTap);
      
      return () => {
        document.removeEventListener('click', handleFirstTap);
      };
    }
  }, [room, shouldAutoFocus]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const { emit } = useSocket({
    onPartnerFound: ({ room, partnerInfo: receivedPartnerInfo }) => {
      console.log('Partner found:', receivedPartnerInfo);
      setRoom(room);
      setMessages([]);
      setIsSearching(false);
      setPartnerInfo(receivedPartnerInfo);
      setShouldAutoFocus(true); // Allow focus after connection
      showNotification(`Connected to ${receivedPartnerInfo.username}!`);
    },

    onReceiveMessage: (msg) => {
      setMessages(prev => [...prev, { text: msg, sender: 'stranger' }]);
    },

    onPartnerTyping: (typing) => setIsPartnerTyping(typing),

    onPartnerDisconnected: () => {
      disconnectChat();
      showNotification("Stranger disconnected");
    },

    onWaiting: (message) => {
      setNotification(message);
      setTimeout(() => setNotification(""), 3000);
    }
  });

  const findPartner = () => {
    if (room) {
      emit('leave_chat', { room, fingerprint });
      setTimeout(() => {
        // Small delay to ensure leave event is processed
        startNewSearch();
      }, 100);
    } else {
      startNewSearch();
    }
  };

  const startNewSearch = () => {
    setRoom(null);
    setMessages([]);
    setIsSearching(true);
    setPartnerInfo({ gender: null, username: 'Stranger', showGender: false });
    setShouldAutoFocus(false); // Reset auto-focus for new connection
    
    emit('find_partner', { 
      fingerprint, 
      userData: {
        ...userData,
        username: userData.username.trim() || 'Stranger'
      }
    });
  };

  const cancelSearch = () => {
    setIsSearching(false);
    emit('cancel_search', { fingerprint });
  };

  const disconnectChat = () => {
    if (room) {
      emit('leave_chat', { room, fingerprint });
    }
    setRoom(null);
    setMessages([]);
    setPartnerInfo({ gender: null, username: 'Stranger', showGender: false });
    setShouldAutoFocus(false); // Reset auto-focus
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      emit('send_message', { room, message: message.trim() });
      emit('typing', { room, isTyping: false });
      setMessages(prev => [...prev, { text: message.trim(), sender: 'me' }]);
      setMessage("");
      
      // Keep keyboard open after sending on mobile
      if (isMobile) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      }
    }
  };

  const handleTypingStart = (isTyping) => {
    if (room) {
      emit('typing', { room, isTyping });
    }
  };

  const handleSavePreferences = () => {
    showNotification("Preferences saved!");
  };

  // Close keyboard when tapping messages (mobile only)
  const handleCloseKeyboard = () => {
    if (isMobile && document.activeElement && document.activeElement.tagName === 'INPUT') {
      document.activeElement.blur();
      setIsKeyboardOpen(false);
    }
  };

  // Keyboard toggle handler
  const handleKeyboardToggle = (isOpen) => {
    setIsKeyboardOpen(isOpen);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl">
          {notification}
        </div>
      )}

      {/* HEADER - Hide on mobile only when keyboard is open */}
      <div className={`sticky top-0 z-40 transition-transform duration-300 ${
        isMobile && isKeyboardOpen ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <Header 
          room={room}
          isSearching={isSearching}
          onDisconnect={disconnectChat}
          onCancelSearch={cancelSearch}
          onFindPartner={findPartner}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!room && !isSearching ? (
          <div className="flex-1 overflow-y-auto p-4">
            <HomeView 
              userData={userData}
              onUserDataChange={setUserData}
              onFindPartner={findPartner}
              onSavePreferences={handleSavePreferences}
            />
          </div>
        ) : isSearching ? (
          <div className="flex-1 overflow-y-auto p-4">
            <SearchView 
              userData={userData}
              onCancelSearch={cancelSearch}
            />
          </div>
        ) : (
          <>
            {/* PARTNER INFO - ALWAYS VISIBLE */}
            <PartnerInfo partnerInfo={partnerInfo} userData={userData} />

            {/* CHAT INTERFACE - Tap to close keyboard (mobile only) */}
            <ChatInterface 
              messages={messages}
              partnerInfo={partnerInfo}
              isPartnerTyping={isPartnerTyping}
              onCloseKeyboard={isMobile ? handleCloseKeyboard : undefined}
              chatContainerRef={chatContainerRef}
              messagesEndRef={messagesEndRef}
            />

            {/* CHAT INPUT - Always at bottom */}
            <div className="sticky bottom-0 z-20 bg-slate-900 border-t border-slate-800">
              <ChatInput 
                ref={inputRef}
                message={message}
                onMessageChange={setMessage}
                onSendMessage={sendMessage}
                onTypingStart={handleTypingStart}
                onTypingEnd={() => handleTypingStart(false)}
                room={room}
                onKeyboardToggle={handleKeyboardToggle}
                shouldAutoFocus={shouldAutoFocus}
                setShouldAutoFocus={setShouldAutoFocus}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}