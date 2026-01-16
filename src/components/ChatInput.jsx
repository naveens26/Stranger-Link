import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const ChatInput = forwardRef(({ 
  message, 
  onMessageChange, 
  onSendMessage, 
  onTypingStart, 
  onTypingEnd, 
  room,
  onKeyboardToggle,
  shouldAutoFocus,
  setShouldAutoFocus
}, ref) => {
  const typingTimeoutRef = useRef(null);
  const internalInputRef = useRef(null);
  const hasSentFirstMessage = useRef(false);

  // Combine refs
  useImperativeHandle(ref, () => ({
    focus: () => {
      internalInputRef.current?.focus();
    },
    blur: () => {
      internalInputRef.current?.blur();
    },
    getElement: () => internalInputRef.current
  }));

  // Remove auto-focus on room connection
  useEffect(() => {
    if (room && setShouldAutoFocus) {
      // Don't auto-focus, but allow manual focus later
      setShouldAutoFocus(true);
    }
  }, [room, setShouldAutoFocus]);

  // Handle keyboard visibility with better detection
  useEffect(() => {
    const handleFocus = () => {
      if (onKeyboardToggle) {
        // Delay to ensure keyboard is fully open
        setTimeout(() => onKeyboardToggle(true), 100);
      }
    };

    const handleBlur = () => {
      if (onKeyboardToggle) {
        // Delay to ensure keyboard is fully closed
        setTimeout(() => {
          // Check if any input is still focused
          const activeElement = document.activeElement;
          const isAnyInputFocused = activeElement.tagName === 'INPUT' || 
                                   activeElement.tagName === 'TEXTAREA';
          
          if (!isAnyInputFocused) {
            onKeyboardToggle(false);
          }
        }, 300);
      }
    };

    const input = internalInputRef.current;
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
      handleSend(e);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    
    if (message.trim() && room) {
      // Send message
      onSendMessage(e);
      
      // Keep keyboard open after sending
      setTimeout(() => {
        if (internalInputRef.current) {
          internalInputRef.current.focus();
        }
      }, 50);
      
      // Track that we've sent first message
      hasSentFirstMessage.current = true;
    }
  };

  return (
    <form 
      onSubmit={handleSend}
      className="p-4 flex gap-2"
      style={{ 
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))'
      }}
    >
      <input 
        ref={internalInputRef}
        value={message}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
        autoComplete="off"
        // Disable auto-focus completely
        autoFocus={false}
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
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;