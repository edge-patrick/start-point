'use client';

import { useState, useEffect } from 'react';

export default function NotesWidget() {
  const [notes, setNotes] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedNotes = localStorage.getItem('dashboard-notes');
    if (savedNotes) {
      setNotes(savedNotes);
    }
    setIsLoaded(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    localStorage.setItem('dashboard-notes', newNotes);
  };

  if (!isLoaded) return <div className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>;

  return (
    <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl">
      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-4 uppercase tracking-widest">Notes</h3>
      <textarea
        className="flex-1 w-full bg-transparent resize-none focus:outline-none text-white placeholder-white/40 font-mono text-sm"
        placeholder="// Write some code or notes here..."
        value={notes}
        onChange={handleChange}
      />
    </div>
  );
}
