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
    <div className="max-w-3xl mx-auto space-y-4 pb-4">
      <PartnerInfo partnerInfo={partnerInfo} userData={userData} />
      
      <MessageList messages={messages} partnerInfo={partnerInfo} />
      
      {isPartnerTyping && (
        <TypingIndicator partnerInfo={partnerInfo} />
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatInterface;