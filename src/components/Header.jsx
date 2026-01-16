// components/Header.jsx
const Header = ({ 
  room, 
  isSearching, 
  onDisconnect, 
  onCancelSearch, 
  onFindPartner 
}) => {
  return (
    <header className="sticky top-0 z-40 p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black text-white uppercase">Stranger<span className="text-blue-500">Link</span></h1>
        {room && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-slate-400">Connected</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {room && (
          <button 
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 whitespace-nowrap"
          >
            <span>⏏️</span>
            <span className="hidden sm:inline">DISCONNECT</span>
            <span className="sm:hidden">DC</span>
          </button>
        )}
        {isSearching && (
          <button 
            onClick={onCancelSearch}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap"
          >
            CANCEL
          </button>
        )}
        <button 
          onClick={onFindPartner} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap"
        >
          {room ? (
            <>
              <span className="hidden sm:inline">NEXT</span>
              <span className="sm:hidden">➡️</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">START</span>
              <span className="sm:hidden">▶️</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;