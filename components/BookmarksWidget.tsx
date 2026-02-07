'use client';

import { 
  Search, 
  Youtube, 
  Share2,
  MessageCircle,
  Sparkles,
  Bot
} from 'lucide-react';

const BOOKMARKS = [
  { name: 'ChatGPT', url: 'https://chat.openai.com', icon: Sparkles, color: 'text-emerald-400' },
  { name: 'Claude', url: 'https://claude.ai', icon: Bot, color: 'text-orange-400' },
  { name: 'T3Chat', url: 'https://t3.chat', icon: MessageCircle, color: 'text-pink-500' },
  { name: 'Google', url: 'https://google.com', icon: Search, color: 'text-red-400' },
  { name: 'YouTube', url: 'https://youtube.com', icon: Youtube, color: 'text-rose-500' },
  { name: 'Reddit', url: 'https://reddit.com', icon: Share2, color: 'text-orange-600' },
];

export default function BookmarksWidget() {
  return (
    <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl">
      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-6 uppercase tracking-widest">Bookmarks</h3>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {BOOKMARKS.map((bookmark) => {
          const Icon = bookmark.icon;
          return (
            <a
              key={bookmark.url}
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 dark:hover:bg-zinc-800/40 transition-all border border-transparent hover:border-white/20 group"
            >
              <Icon size={18} className={`${bookmark.color} transition-transform group-hover:scale-110`} />
              <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{bookmark.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
