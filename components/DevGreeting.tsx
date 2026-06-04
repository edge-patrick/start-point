"use client";

import { useSyncExternalStore } from "react";

const DEV_GREETINGS = [
  "wagwan bossman, time to pattern this ting",
  "rise n grind my drilla, no slacking today",
  "allow the nonsense, let's get this bread",
  "you ready yeah? man's got work to chef up",
  "no cap, today we moving productive still",
  "lock in fam, distractions getting bun",
  "oi, that project ain't gonna build itself yk",
  "man's on job today, different energy",
  "if it ain't done today it's peak still",
  "pattern up or get left behind, simple",
  "let's make moves, no long ting",
  "focus mode activated, chat later",
  "today we coding like rent's due tomorrow",
  "no excuses fam, just results",
  "man's got goals, not just vibes",
  "stay sharp, stay dangerous",
  "less talking, more doing init",
  "work rate mad today, let's go",
  "big man ting, we shipping features today no waffle",
  "big man ting, we shipping before vibes kick in",
  "big man ting, bugs getting packed one by one",
  "deploy season, big man ting no rollback business",
  "man's pushing commits like it's big man ting, no fear",
];

const LAST_DEV_GREETING_STORAGE_KEY = "start-point-last-dev-greeting";

let greetingSnapshot: string | null = null;

const getRandomGreeting = () => {
  if (greetingSnapshot) return greetingSnapshot;

  const lastGreeting = window.localStorage.getItem(LAST_DEV_GREETING_STORAGE_KEY);
  const availableGreetings = DEV_GREETINGS.filter((greeting) => greeting !== lastGreeting);
  const greetingPool = availableGreetings.length > 0 ? availableGreetings : DEV_GREETINGS;
  const nextGreeting = greetingPool[Math.floor(Math.random() * greetingPool.length)];

  window.localStorage.setItem(LAST_DEV_GREETING_STORAGE_KEY, nextGreeting);
  greetingSnapshot = nextGreeting;

  return greetingSnapshot;
};

const subscribeToGreeting = () => () => undefined;

export default function DevGreeting() {
  const greeting = useSyncExternalStore(
    subscribeToGreeting,
    getRandomGreeting,
    () => ""
  );

  return (
    <p className="text-xl font-mono text-zinc-400" suppressHydrationWarning>
      <span className="text-emerald-500">$</span> {greeting}
    </p>
  );
}
