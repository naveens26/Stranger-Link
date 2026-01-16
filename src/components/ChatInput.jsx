// components/ChatInput.jsx
import { useEffect, useRef } from 'react';

const ChatInput = ({ 
  message, 
  onMessageChange, 
  onSendMessage, 
  onTypingStart, 
  onTypingEnd, 
  room 
}) => {
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Mobile-specific fix: Handle keyboard appearance
  useEffect(() => {
    const handleFocus = () => {
      // Scroll to bottom when input is focused (keyboard appears)
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleFocus);
      return () => {
        input.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  const handleTyping = (text) => {
    onMessageChange(text);
    
    if (room) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      onTypingStart(text.length > 0);
      
      if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          onTypingStart(false);
        }, 1000);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e);
    }
  };

  return (
    <form 
      onSubmit={onSendMessage} 
      className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 sticky bottom-0 z-30"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <input 
        ref={inputRef}
        value={message}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (room && message.length === 0) {
            onTypingStart(true);
          }
        }}
        onBlur={() => {
          if (room) {
            onTypingStart(false);
          }
        }}
        placeholder="Type your message..."
        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
      />
      <button 
        type="submit"
        className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        disabled={!message.trim()}
      >
        SEND
      </button>
    </form>
  );
};

export default ChatInput;