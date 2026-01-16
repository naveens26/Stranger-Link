// components/PartnerInfo.jsx
import { genderUtils } from '../hooks/useSocket';

const PartnerInfo = ({ partnerInfo, userData }) => {
  const { showGender, gender, username } = partnerInfo;
  const { showGender: userShowGender, gender: userGender } = userData;

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg mb-4 ${showGender ? genderUtils.getGenderBgColor(gender) : 'bg-slate-900'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          {showGender ? genderUtils.getGenderIcon(gender) : '👤'}
        </span>
        <div>
          <p className="font-bold text-lg">{username}</p>
          <p className="text-xs flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${showGender ? genderUtils.getGenderColor(gender).replace('text', 'bg') : 'bg-green-500'}`}></span>
            <span className="text-slate-400">
              {showGender ? 
                `${gender.charAt(0).toUpperCase() + gender.slice(1)} • Online` : 
                'Stranger • Online'}
            </span>
          </p>
        </div>
      </div>
      {userShowGender && (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${genderUtils.getGenderBgColor(userGender)} border`}>
          <span className="text-sm">You: </span>
          <span className="text-lg">{genderUtils.getGenderIcon(userGender)}</span>
          <span className={`text-sm font-medium ${genderUtils.getGenderColor(userGender)}`}>
            {userGender.charAt(0).toUpperCase() + userGender.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
};

export default PartnerInfo;