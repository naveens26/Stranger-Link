// components/ChatInterface.jsx
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ 
  messages, 
  partnerInfo, 
  isPartnerTyping, 
  onCloseKeyboard,
  chatContainerRef, 
  messagesEndRef 
}) => {
  
  // Handle tap to close keyboard
  const handleChatAreaClick = (e) => {
    // Only trigger if clicked directly on the container (not on messages)
    if (onCloseKeyboard && e.target === e.currentTarget) {
      onCloseKeyboard();
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto"
      onClick={handleChatAreaClick}
      ref={chatContainerRef}
      style={{ 
        paddingBottom: '6rem',
        WebkitOverflowScrolling: 'touch',
        minHeight: '0', // Ensure flex container works properly
      }}
    >
      <div className="px-4 pt-4 space-y-4">
        <MessageList messages={messages} partnerInfo={partnerInfo} />
        
        {isPartnerTyping && (
          <TypingIndicator partnerInfo={partnerInfo} />
        )}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
};

export default ChatInterface;