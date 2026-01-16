// components/TypingIndicator.jsx
import { genderUtils } from '../hooks/useSocket';
import '../styles/animations.css';

const TypingIndicator = ({ partnerInfo }) => {
  const { showGender, gender } = partnerInfo;
  
  // Get the correct color class for the dots
  const dotColorClass = showGender 
    ? genderUtils.getBgColorClass(gender)
    : 'bg-slate-400';

  return (
    <div className="flex justify-start">
      <div className={`px-4 py-3 rounded-2xl rounded-bl-none ${showGender ? genderUtils.getGenderBgColor(gender).replace('border', '') : 'bg-slate-800'}`}>
        <div className="flex space-x-1 items-center">
          <div className={`${dotColorClass} dot-bounce dot-bounce-1 animate-dot`}></div>
          <div className={`${dotColorClass} dot-bounce dot-bounce-2 animate-dot`}></div>
          <div className={`${dotColorClass} dot-bounce dot-bounce-3 animate-dot`}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;