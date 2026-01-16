// components/ChatInterface.jsx
import MessageList from './MessageList';
import PartnerInfo from './PartnerInfo';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ 
  messages, 
  partnerInfo, 
  userData, 
  isPartnerTyping, 
  chatContainerRef, 
  messagesEndRef 
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Fixed PartnerInfo bar at the top */}
      <div className="sticky top-0 z-20 bg-slate-900">
        <PartnerInfo partnerInfo={partnerInfo} userData={userData} />
      </div>
      
      {/* Messages container with padding for fixed header */}
      <div className="p-4 pt-2 space-y-4 pb-24" ref={chatContainerRef}>
        <MessageList messages={messages} partnerInfo={partnerInfo} />
        
        {isPartnerTyping && (
          <TypingIndicator partnerInfo={partnerInfo} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;