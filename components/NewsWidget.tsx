'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Globe, Star, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: 'World' | 'Slovakia';
    isoDate: string;
    imageUrl?: string;
}

type Tab = 'all' | 'world' | 'slovakia';

export default function NewsWidget() {
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = async (category: Tab) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/news?category=${category}`);
            if (!response.ok) throw new Error('Failed to fetch news');
            const data = await response.json();
            setNews(data.items);
        } catch (err) {
            setError('Failed to load news');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews(activeTab);
    }, [activeTab]);

    return (
        <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl overflow-hidden relative group">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Newspaper size={14} />
                    News Feed
                </h3>
                <div className="flex bg-black/20 rounded-lg p-0.5">
                    {(['all', 'world', 'slovakia'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab === 'all' ? 'All' : tab === 'world' ? 'World' : 'SVK'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-2">
                        <p className="text-xs">{error}</p>
                        <button
                            onClick={() => fetchNews(activeTab)}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[10px] text-zinc-400 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    news.map((item, i) => (
                        <a
                            key={i}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group/item relative pl-3 border-l-2 border-transparent hover:border-blue-500 transition-all duration-300"
                        >
                            <div className="flex gap-3">
                                {item.imageUrl && (
                                    <div className="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-zinc-800 relative mt-0.5">
                                        <img
                                            src={item.imageUrl}
                                            alt=""
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110 opacity-80 group-hover/item:opacity-100"
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-medium text-zinc-200 group-hover/item:text-blue-300 transition-colors line-clamp-2 leading-snug">
                                            {item.title}
                                        </h4>
                                        <ExternalLink size={12} className="opacity-0 group-hover/item:opacity-50 text-blue-400 shrink-0 mt-1 transition-opacity" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.source === 'World'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                            }`}>
                                            {item.source}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                            {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>

            {/* Refresh Button (visible on hover) */}
            <button
                onClick={() => fetchNews(activeTab)}
                className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:rotate-180"
                title="Refresh News"
            >
                <RefreshCw size={14} />
            </button>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
}
