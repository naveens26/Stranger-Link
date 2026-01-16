// components/ChatInput.jsx
import { useEffect, useRef } from 'react';

const ChatInput = ({ 
  message, 
  onMessageChange, 
  onSendMessage, 
  onTypingStart, 
  onTypingEnd, 
  room,
  onKeyboardToggle // ADD THIS
}) => {
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus when room is connected
  useEffect(() => {
    if (room && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 1000);
    }
  }, [room]);

  // Handle keyboard visibility
  useEffect(() => {
    const handleFocus = () => {
      if (onKeyboardToggle) onKeyboardToggle(true);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    };

    const handleBlur = () => {
      if (onKeyboardToggle) onKeyboardToggle(false);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
      return () => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      };
    }
  }, [onKeyboardToggle]);

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
      className="p-4 flex gap-2"
      style={{ 
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))'
      }}
    >
      <input 
        ref={inputRef}
        value={message}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
        autoComplete="off"
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