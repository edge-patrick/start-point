"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_GREETING_PERSONALITY,
  GREETING_PERSONALITIES,
  normalizeGreetingPersonality,
} from "@/lib/greetings";
import type { GreetingPersonality } from "@/lib/greetings";
import {
  GREETING_PERSONALITY_CHANGE_EVENT,
  GREETING_PERSONALITY_STORAGE_KEY,
} from "@/lib/settings";

const LAST_DEV_GREETING_STORAGE_KEY = "start-point-last-dev-greeting";

let greetingSnapshot: {
  greeting: string;
  personality: GreetingPersonality;
} | null = null;

const getGreetingPersonalitySnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_GREETING_PERSONALITY;
  return normalizeGreetingPersonality(
    window.localStorage.getItem(GREETING_PERSONALITY_STORAGE_KEY)
  );
};

const getLastGreetingStorageKey = (personality: GreetingPersonality) =>
  `${LAST_DEV_GREETING_STORAGE_KEY}-${personality}`;

const getRandomGreeting = () => {
  if (typeof window === "undefined") return "";

  const personality = getGreetingPersonalitySnapshot();
  if (greetingSnapshot?.personality === personality) {
    return greetingSnapshot.greeting;
  }

  const greetings = GREETING_PERSONALITIES[personality];
  const lastGreeting = window.localStorage.getItem(
    getLastGreetingStorageKey(personality)
  );
  const availableGreetings = greetings.filter(
    (greeting) => greeting !== lastGreeting
  );
  const greetingPool =
    availableGreetings.length > 0 ? availableGreetings : greetings;
  const nextGreeting =
    greetingPool[Math.floor(Math.random() * greetingPool.length)];

  window.localStorage.setItem(
    getLastGreetingStorageKey(personality),
    nextGreeting
  );
  greetingSnapshot = {
    greeting: nextGreeting,
    personality,
  };

  return greetingSnapshot.greeting;
};

const subscribeToGreeting = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GREETING_PERSONALITY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GREETING_PERSONALITY_CHANGE_EVENT, onStoreChange);
  };
};

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
