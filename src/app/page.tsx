export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              🗺️ 香港親子地圖
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6">
              發掘全港最適合親子活動的好去處
            </p>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto flex gap-2 px-4 sm:px-0">
              <input
                type="text"
                placeholder="🔍 搜尋地點..."
                className="flex-1 min-w-0 px-4 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
              <button className="px-4 sm:px-6 py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-300 transition-colors whitespace-nowrap">
                搜尋
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Coming Soon */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🚧 網站升級中
        </h2>
        <p className="text-gray-600 mb-6">
          我們正在將網站遷移到 Next.js，帶來更流暢嘅體驗！
        </p>
        <p className="text-sm text-gray-500">
          預計完成時間：2026年2月15日
        </p>
      </div>
    </main>
  );
}
