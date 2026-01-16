// components/MessageList.jsx
import { genderUtils } from '../hooks/useSocket';

const MessageList = ({ messages, partnerInfo }) => {
  const { showGender, gender } = partnerInfo;

  return (
    <>
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
          <div className={`px-4 py-2 rounded-2xl max-w-sm ${m.sender === 'me' ? 'bg-blue-600 rounded-br-none' : `${showGender ? genderUtils.getGenderBgColor(gender).replace('border', '') : 'bg-slate-800'} rounded-bl-none`}`}>
            {m.text}
          </div>
        </div>
      ))}
    </>
  );
};

export default MessageList;