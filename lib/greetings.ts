export const GREETING_PERSONALITIES = {
  terminal: [
    "boot sequence clean, time to ship",
    "all systems nominal, let's make progress",
    "permission granted: go build something useful",
    "cache cleared, focus restored",
    "new session started, today's commit awaits",
    "runtime stable, momentum loading",
    "no errors yet, let's keep it suspiciously productive",
    "deploy mindset active",
    "command accepted: lock in",
    "green checks only today",
    "logs look good, now do the thing",
    "uptime high, excuses low",
  ],
  roadman: [
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
  ],
  buddhist: [
    "breathe in focus, breathe out procrastination",
    "small steps, clear mind, steady progress",
    "the task is only heavy before you begin",
    "return to the work, gently but firmly",
    "one mindful action can move the whole day",
    "no rush, no drift, just presence",
    "let the noise pass, keep the intention",
    "today's path is built one calm choice at a time",
    "make peace with the todo list, then shorten it",
    "clarity arrives when you start",
    "do the next right thing, then the next",
    "even deep work begins with one breath",
  ],
  drillSergeant: [
    "eyes forward, tabs closed, move",
    "quit negotiating with the task",
    "focus up, you've got work to win",
    "today we execute, not elaborate",
    "discipline first, vibes after",
    "pick the target and advance",
    "no wandering, no waiting, get it done",
    "you're not tired, you're warming up",
    "make the plan, hit the mark",
    "less hesitation, more operation",
    "the mission is progress",
    "stand by for productivity",
  ],
  missionControl: [
    "trajectory is green, proceed with the plan",
    "systems checked, launch the first task",
    "mission clock started, execute calmly",
    "guidance is locked, follow the next waypoint",
    "fuel is focus, burn it wisely",
    "orbit looks stable, keep momentum",
    "countdown complete, lift the smallest task",
    "comms are clear, call the next move",
    "all stations go, make today's progress visible",
    "course correction accepted, back to work",
    "payload is progress, deliver it clean",
    "no anomaly detected, continue the mission",
  ],
  cozyBarista: [
    "fresh start brewed, take the first sip",
    "warm mug, clear mind, gentle progress",
    "one small win, then another",
    "steam rising, focus settling",
    "today's special is steady momentum",
    "pull the perfect shot, then tackle the task",
    "soft playlist on, distractions off",
    "refill your patience, keep the work warm",
    "sip by sip, the list gets lighter",
    "fresh page, fresh roast, fresh attempt",
    "make it cozy, then make it done",
    "settle in, the next win is brewing",
  ],
  noirDetective: [
    "the case is open, start with the first clue",
    "procrastination left fingerprints, follow the evidence",
    "the task looked tough, but focus had an alibi",
    "close the tabs, question the excuses",
    "the todo list talked big, then folded",
    "one clean step and the whole case gets warmer",
    "the deadline is lurking, but you have the lead",
    "keep your coat on, detective, progress is outside",
    "the clues point to starting small",
    "motivation vanished, discipline stayed for questioning",
    "the night is long, but the work cracks first",
    "file the doubt, chase the next lead",
  ],
} as const;

export type GreetingPersonality = keyof typeof GREETING_PERSONALITIES;

export const DEFAULT_GREETING_PERSONALITY: GreetingPersonality = "terminal";

export const GREETING_PERSONALITY_OPTIONS: {
  id: GreetingPersonality;
  label: string;
}[] = [
  { id: "terminal", label: "Terminal" },
  { id: "roadman", label: "Roadman" },
  { id: "buddhist", label: "Buddhist" },
  { id: "drillSergeant", label: "Drill Sergeant" },
  { id: "missionControl", label: "Mission Control" },
  { id: "cozyBarista", label: "Cozy Barista" },
  { id: "noirDetective", label: "Noir Detective" },
];

const greetingPersonalityIds = new Set<string>(
  GREETING_PERSONALITY_OPTIONS.map((option) => option.id)
);

export const normalizeGreetingPersonality = (
  value: unknown
): GreetingPersonality =>
  typeof value === "string" && greetingPersonalityIds.has(value)
    ? (value as GreetingPersonality)
    : DEFAULT_GREETING_PERSONALITY;
