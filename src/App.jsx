// App.jsx - FINAL WORKING VERSION
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
  
  // Keyboard state - SIMPLIFIED: only track if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef();
  const chatContainerRef = useRef();
  const scrollTimeoutRef = useRef(null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Handle page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (room) {
        emit('leave_chat', { room, fingerprint });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      emit('send_message', { room, message: message.trim() });
      emit('typing', { room, isTyping: false });
      setMessages(prev => [...prev, { text: message.trim(), sender: 'me' }]);
      setMessage("");
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
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl">
          {notification}
        </div>
      )}

      {/* HEADER - ALWAYS VISIBLE */}
      <Header 
        room={room}
        isSearching={isSearching}
        onDisconnect={disconnectChat}
        onCancelSearch={cancelSearch}
        onFindPartner={findPartner}
      />

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

            {/* CHAT INPUT */}
            <div className="sticky bottom-0 z-20 bg-slate-900 border-t border-slate-800">
              <ChatInput 
                message={message}
                onMessageChange={setMessage}
                onSendMessage={sendMessage}
                onTypingStart={handleTypingStart}
                onTypingEnd={() => handleTypingStart(false)}
                room={room}
                // Remove onKeyboardToggle to prevent header hiding
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}