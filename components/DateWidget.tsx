'use client';

import { useState, useEffect } from 'react';

export default function DateWidget() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date());
    const timer = setInterval(() => setDate(new Date()), 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);

  if (!date) return <div className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>;

  const day = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const year = date.getFullYear();

  return (
    <div className="flex flex-col">
      <h2 className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">{day}</h2>
      <p className="text-2xl font-medium text-white/70 tracking-tight">{month}, {year}</p>
    </div>
  );
}
