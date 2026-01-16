// components/MessageList.jsx
import { genderUtils } from '../hooks/useSocket';

const MessageList = ({ messages, partnerInfo }) => {
  const { showGender, gender } = partnerInfo;

  return (
    <>
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'} mb-3`}>
          <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${m.sender === 'me' ? 'bg-blue-600 rounded-br-none' : `${showGender ? genderUtils.getGenderBgColor(gender).replace('border', '') : 'bg-slate-800'} rounded-bl-none`}`}>
            <p className="text-white break-words whitespace-pre-wrap">{m.text}</p>
          </div>
        </div>
      ))}
    </>
  );
};

export default MessageList;