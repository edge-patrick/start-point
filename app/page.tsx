import DateWidget from '@/components/DateWidget';
import WeatherWidget from '@/components/WeatherWidget';
import NotesWidget from '@/components/NotesWidget';
import BookmarksWidget from '@/components/BookmarksWidget';
import DevGreeting from '@/components/DevGreeting';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) contrast(1.1)',
        }}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen p-8 md:p-16 lg:p-24 flex flex-col">
        <main className="max-w-6xl mx-auto w-full space-y-16 my-auto">
          
          {/* Dev-style Greeting & Date */}
          <header className="space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm mb-4">
              <span className="text-xs font-mono font-bold text-blue-400 tracking-widest uppercase">
                System Status: Online
              </span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Patrick</span>
              </h1>
              <DevGreeting />
            </div>

            <div className="pt-8">
              <DateWidget />
            </div>
          </header>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {/* Weather Widget */}
            <div className="transition-transform hover:scale-[1.02] duration-300 h-[280px]">
              <WeatherWidget />
            </div>

            {/* Bookmarks Widget */}
            <div className="transition-transform hover:scale-[1.02] duration-300 h-[280px]">
              <BookmarksWidget />
            </div>

            {/* Notes Widget */}
            <div className="transition-transform hover:scale-[1.02] duration-300 h-[280px]">
              <NotesWidget />
            </div>
          </div>
        </main>

        {/* Footer info */}
        <footer className="mt-auto pt-16 text-center">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-[0.3em]">
            Start Point Terminal v1.0.0
          </p>
        </footer>
      </div>
    </div>
  );
}
