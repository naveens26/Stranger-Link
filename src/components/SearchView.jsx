// components/SearchView.jsx

const SearchView = ({ userData, onCancelSearch }) => {
  const getPartnerGenderText = () => {
    switch(userData.partnerGender) {
      case 'male': return '♂️ Male';
      case 'female': return '♀️ Female';
      case 'any': return '👥 Anyone';
      default: return '👤 Anyone';
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-blue-400 font-bold mb-2">Searching for partner...</p>
      <p className="text-slate-500 mb-4">Looking for: {getPartnerGenderText()}</p>
      <button 
        onClick={onCancelSearch}
        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold mb-4"
      >
        CANCEL SEARCH
      </button>
      <p className="text-xs text-slate-500 bg-slate-900 p-4 rounded-lg text-center max-w-xs">
        Note: You cannot connect to the same stranger twice within 30 minutes.
      </p>
    </div>
  );
};

export default SearchView;