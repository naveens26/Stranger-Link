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
  return (
    <div 
      className="flex-1 overflow-y-auto"
      onClick={onCloseKeyboard}
      ref={chatContainerRef}
      style={{ 
        paddingBottom: '6rem',
        WebkitOverflowScrolling: 'touch'
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