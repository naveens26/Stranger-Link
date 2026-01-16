// components/PreferencesModal.jsx

const PreferencesModal = ({ userData, onUserDataChange, onClose, onSave }) => {
  const getPartnerGenderText = () => {
    switch(userData.partnerGender) {
      case 'male': return '♂️ Male';
      case 'female': return '♀️ Female';
      case 'any': return '👥 Anyone';
      default: return '👤 Anyone';
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400">
      <div className="bg-slate-900 p-6 rounded-xl max-w-md w-full space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Preferences</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

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

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between">
            <button 
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              BACK
            </button>
            <button 
              onClick={onSave}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesModal;