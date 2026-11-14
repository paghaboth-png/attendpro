import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
            A
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AttendPro
            </span>
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Cloud Ready
            </span>
          </div>
        </div>
        <div className="text-sm font-medium text-slate-400">
          ហាងគំរូ៖ <span className="text-white font-semibold">TheDemo Coffee</span>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          ដំណាក់កាលទី ០ (Phase 0) • ត្រៀមតភ្ជាប់លើប្រព័ន្ធ Online
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Hello AttendPro! 👋
          <span className="block text-2xl sm:text-3xl font-medium text-slate-300 mt-3">
            ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកតាមអនឡាញ
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកជំនាន់ថ្មីសម្រាប់ <strong className="text-white">TheDemo Coffee</strong>។
          បុគ្គលិកអាចស្កេនវត្តមានពីទូរស័ព្ទដៃដោយផ្ទាល់ជាមួយទីតាំង GPS និងរូបថត Selfie ចំណែក Admin គ្រប់គ្រងយ៉ាងងាយស្រួលតាមកុំព្យូទ័រ។
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left mb-12">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="text-2xl mb-2">📍</div>
            <h3 className="font-semibold text-white text-base mb-1">GPS Check-in</h3>
            <p className="text-xs text-slate-400">
              កំណត់វត្តមានបានលុះត្រាតែបុគ្គលិកស្ថិតនៅក្នុងកាំរង្វង់ហាងជាក់ស្តែង។
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="text-2xl mb-2">📸</div>
            <h3 className="font-semibold text-white text-base mb-1">Selfie Verification</h3>
            <p className="text-xs text-slate-400">
              ថតរូបផ្ទាល់ពេល Check-in/Out ធានាថាមិនអាចស្កេនជំនួសគ្នាបានឡើយ។
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-white text-base mb-1">Live Dashboard</h3>
            <p className="text-xs text-slate-400">
              តាមដានស្ថិតិវត្តមានបុគ្គលិកផ្ទាល់រៀងរាល់ ៦០ វិនាទី លើកុំព្យូទ័រ។
            </p>
          </div>
        </div>

        {/* Status Box */}
        <div className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>ស្ថានភាព៖ <strong>រង់ចាំការតភ្ជាប់គណនី Cloud (GitHub, Vercel, Neon)</strong></span>
          </div>
          <div className="text-slate-500 hidden sm:block">
            Next.js 14 • PostgreSQL • PWA
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AttendPro — ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃ។ រក្សាសិទ្ធិគ្រប់យ៉ាង។
      </footer>
    </div>
  );
}
