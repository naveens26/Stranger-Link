// components/HomeView.jsx
import { useState } from 'react';
import { genderUtils } from '../hooks/useSocket';

const HomeView = ({ userData, onUserDataChange, onFindPartner, onSavePreferences }) => {
  const [isEditing, setIsEditing] = useState(false);

  const getPartnerGenderText = () => {
    switch(userData.partnerGender) {
      case 'male': return '♂️ Male';
      case 'female': return '♀️ Female';
      case 'any': return '👥 Anyone';
      default: return '👤 Anyone';
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    onSavePreferences();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400">
      <p className="text-2xl font-bold text-white mb-6">Chat with Strangers</p>
      
      <div className="bg-slate-900 p-6 rounded-xl max-w-md w-full space-y-6">
        {/* Edit Button */}
        <div className="flex justify-end">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
          >
            <span>⚙️</span>
            <span>{isEditing ? 'Cancel' : 'Edit Preferences'}</span>
          </button>
        </div>

        {isEditing ? (
          /* EDIT MODE */
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Your Gender (Optional)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, gender: "male", showGender: true})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${userData.gender === "male" && userData.showGender ? "bg-blue-900/50 border-2 border-blue-500" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">♂️</span>
                  <span className="text-xs">Male</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, gender: "female", showGender: true})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${userData.gender === "female" && userData.showGender ? "bg-pink-900/50 border-2 border-pink-500" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">♀️</span>
                  <span className="text-xs">Female</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, showGender: false})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${!userData.showGender ? "bg-slate-700 border-2 border-slate-600" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">👤</span>
                  <span className="text-xs">Anonymous</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {userData.showGender ? 
                  `Your gender will be shown to your partner` : 
                  'Your gender will be hidden'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Partner Preference</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, partnerGender: "any"})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${userData.partnerGender === "any" ? "bg-blue-900/50 border-2 border-blue-500" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">👥</span>
                  <span className="text-xs">Anyone</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, partnerGender: "male"})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${userData.partnerGender === "male" ? "bg-blue-900/50 border-2 border-blue-500" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">♂️</span>
                  <span className="text-xs">Male</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUserDataChange({...userData, partnerGender: "female"})}
                  className={`py-3 rounded-lg font-bold flex flex-col items-center justify-center gap-1 ${userData.partnerGender === "female" ? "bg-pink-900/50 border-2 border-pink-500" : "bg-slate-800"}`}
                >
                  <span className="text-2xl">♀️</span>
                  <span className="text-xs">Female</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Display Name (Optional)</label>
              <input
                type="text"
                value={userData.username}
                onChange={(e) => onUserDataChange({...userData, username: e.target.value})}
                placeholder="Enter a name (or stay as 'Stranger')"
                className="w-full bg-slate-800 border-none rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                maxLength="20"
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold"
            >
              SAVE PREFERENCES
            </button>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="space-y-6">
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg ${userData.showGender ? genderUtils.getGenderBgColor(userData.gender) : 'bg-slate-800'}`}>
                <span className="text-sm">Your Gender:</span>
                <span className="font-bold flex items-center gap-2">
                  {userData.showGender ? (
                    <>
                      <span className="text-xl">{genderUtils.getGenderIcon(userData.gender)}</span>
                      <span className={genderUtils.getGenderColor(userData.gender)}>
                        {userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">👤</span>
                      <span>Anonymous</span>
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between bg-slate-800 p-4 rounded-lg">
                <span className="text-sm">Looking for:</span>
                <span className="font-bold flex items-center gap-2">{getPartnerGenderText()}</span>
              </div>
              
              <div className="flex items-center justify-between bg-slate-800 p-4 rounded-lg">
                <span className="text-sm">Display as:</span>
                <span className="font-bold">{userData.username || 'Stranger'}</span>
              </div>
            </div>

            <button 
              onClick={onFindPartner}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-lg"
            >
              START CHATTING
            </button>
            
            <p className="text-xs text-slate-500 text-center">
              Click START to find a random stranger matching your preferences
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;