'use client';

import { useState } from 'react';

export default function NotesWidget() {
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('dashboard-notes') ?? '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    localStorage.setItem('dashboard-notes', newNotes);
  };

  return (
    <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl">
      <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-4 uppercase tracking-widest">Notes</h3>
      <textarea
        className="flex-1 w-full bg-transparent resize-none focus:outline-none text-white placeholder-white/40 font-mono text-sm"
        placeholder="// Write some code or notes here..."
        value={notes}
        onChange={handleChange}
        suppressHydrationWarning
      />
    </div>
  );
}
