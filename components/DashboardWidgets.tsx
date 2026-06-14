"use client";

import {
  ComponentType,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ChevronDown,
  CloudSun,
  Eye,
  EyeOff,
  GripVertical,
  Mail,
  Save,
  Music,
  Newspaper,
  NotebookPen,
  Settings,
  X,
} from "lucide-react";
import WeatherWidget from "@/components/WeatherWidget";
import MusicWidget from "@/components/MusicWidget";
import NewsWidget from "@/components/NewsWidget";
import BookmarksWidget from "@/components/BookmarksWidget";
import NotesWidget from "@/components/NotesWidget";
import DateWidget from "@/components/DateWidget";
import DevGreeting from "@/components/DevGreeting";
import EmailWidget from "@/components/EmailWidget";
import { APP_VERSION } from "@/lib/appInfo";
import {
  DEFAULT_WEATHER_CITY,
  EMAIL_AUTHORIZATION_CHANGE_EVENT,
  EMAIL_AUTHORIZATION_STORAGE_KEY,
  GREETING_PERSONALITY_CHANGE_EVENT,
  GREETING_PERSONALITY_STORAGE_KEY,
  USER_NAME_CHANGE_EVENT,
  USER_NAME_STORAGE_KEY,
  WEATHER_CITY_CHANGE_EVENT,
  WEATHER_CITY_STORAGE_KEY,
} from "@/lib/settings";
import {
  DEFAULT_GREETING_PERSONALITY,
  GREETING_PERSONALITY_OPTIONS,
  normalizeGreetingPersonality,
} from "@/lib/greetings";
import type { GreetingPersonality } from "@/lib/greetings";

type WidgetId = "weather" | "music" | "news" | "email" | "bookmarks" | "notes";

interface WidgetDefinition {
  id: WidgetId;
  label: string;
  defaultEnabled: boolean;
  icon: ComponentType<{ size?: number; className?: string }>;
  Component: ComponentType;
}

interface WidgetSetting {
  id: WidgetId;
  enabled: boolean;
}

const WIDGET_SETTINGS_STORAGE_KEY = "start-point-widget-settings";
const WIDGET_SETTINGS_CHANGE_EVENT = "start-point-widget-settings-change";
const DEFAULT_USER_NAME = "user";

const WIDGETS: WidgetDefinition[] = [
  {
    id: "weather",
    label: "Weather",
    defaultEnabled: true,
    icon: CloudSun,
    Component: WeatherWidget,
  },
  {
    id: "music",
    label: "Music",
    defaultEnabled: true,
    icon: Music,
    Component: MusicWidget,
  },
  {
    id: "news",
    label: "News",
    defaultEnabled: true,
    icon: Newspaper,
    Component: NewsWidget,
  },
  {
    id: "email",
    label: "Email",
    defaultEnabled: true,
    icon: Mail,
    Component: EmailWidget,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    defaultEnabled: false,
    icon: Bookmark,
    Component: BookmarksWidget,
  },
  {
    id: "notes",
    label: "Notes",
    defaultEnabled: false,
    icon: NotebookPen,
    Component: NotesWidget,
  },
];

const DEFAULT_WIDGET_SETTINGS: WidgetSetting[] = WIDGETS.map((widget) => ({
  id: widget.id,
  enabled: widget.defaultEnabled,
}));
const DEFAULT_WIDGET_SETTINGS_SNAPSHOT = JSON.stringify(
  DEFAULT_WIDGET_SETTINGS
);
const HYDRATING_WIDGET_SETTINGS_SNAPSHOT =
  "__start-point-widget-settings-hydrating__";

const widgetIds = new Set<WidgetId>(WIDGETS.map((widget) => widget.id));

const isWidgetId = (value: unknown): value is WidgetId =>
  typeof value === "string" && widgetIds.has(value as WidgetId);

const normalizeWidgetSettings = (value: unknown): WidgetSetting[] => {
  if (!Array.isArray(value)) return DEFAULT_WIDGET_SETTINGS;

  const savedSettings = value.filter(
    (item): item is WidgetSetting =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "enabled" in item &&
      isWidgetId(item.id) &&
      typeof item.enabled === "boolean"
  );

  const seen = new Set<WidgetId>();
  const orderedSettings = savedSettings.filter((setting) => {
    if (seen.has(setting.id)) return false;
    seen.add(setting.id);
    return true;
  });

  const missingSettings = DEFAULT_WIDGET_SETTINGS.filter(
    (setting) => !seen.has(setting.id)
  );

  return [...orderedSettings, ...missingSettings];
};

const getWidgetSettingsSnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_WIDGET_SETTINGS_SNAPSHOT;
  return (
    window.localStorage.getItem(WIDGET_SETTINGS_STORAGE_KEY) ??
    DEFAULT_WIDGET_SETTINGS_SNAPSHOT
  );
};

const subscribeToWidgetSettings = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WIDGET_SETTINGS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WIDGET_SETTINGS_CHANGE_EVENT, onStoreChange);
  };
};

const parseWidgetSettingsSnapshot = (snapshot: string) => {
  try {
    return normalizeWidgetSettings(JSON.parse(snapshot));
  } catch {
    return DEFAULT_WIDGET_SETTINGS;
  }
};

const saveWidgetSettings = (settings: WidgetSetting[]) => {
  window.localStorage.setItem(
    WIDGET_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
  window.dispatchEvent(new Event(WIDGET_SETTINGS_CHANGE_EVENT));
};

const normalizeUserName = (name: string) => name.trim() || DEFAULT_USER_NAME;

const getUserNameSnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_USER_NAME;
  return normalizeUserName(
    window.localStorage.getItem(USER_NAME_STORAGE_KEY) ?? ""
  );
};

const subscribeToUserName = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(USER_NAME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(USER_NAME_CHANGE_EVENT, onStoreChange);
  };
};

const saveUserName = (name: string) => {
  const nextName = name.trim();

  if (nextName) {
    window.localStorage.setItem(USER_NAME_STORAGE_KEY, nextName);
  } else {
    window.localStorage.removeItem(USER_NAME_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(USER_NAME_CHANGE_EVENT));
};

const getGreetingPersonalitySnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_GREETING_PERSONALITY;
  return normalizeGreetingPersonality(
    window.localStorage.getItem(GREETING_PERSONALITY_STORAGE_KEY)
  );
};

const subscribeToGreetingPersonality = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GREETING_PERSONALITY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GREETING_PERSONALITY_CHANGE_EVENT, onStoreChange);
  };
};

const saveGreetingPersonality = (personality: GreetingPersonality) => {
  window.localStorage.setItem(GREETING_PERSONALITY_STORAGE_KEY, personality);
  window.dispatchEvent(new Event(GREETING_PERSONALITY_CHANGE_EVENT));
};

const normalizeWeatherCity = (city: string) =>
  city.trim() || DEFAULT_WEATHER_CITY;

const getWeatherCitySnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_WEATHER_CITY;
  return normalizeWeatherCity(
    window.localStorage.getItem(WEATHER_CITY_STORAGE_KEY) ?? ""
  );
};

const subscribeToWeatherCity = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WEATHER_CITY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WEATHER_CITY_CHANGE_EVENT, onStoreChange);
  };
};

const saveWeatherCity = (city: string) => {
  const nextCity = city.trim();

  if (nextCity) {
    window.localStorage.setItem(WEATHER_CITY_STORAGE_KEY, nextCity);
  } else {
    window.localStorage.removeItem(WEATHER_CITY_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(WEATHER_CITY_CHANGE_EVENT));
};

const getEmailAuthorizationSnapshot = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(EMAIL_AUTHORIZATION_STORAGE_KEY) ?? "";
};

const subscribeToEmailAuthorization = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EMAIL_AUTHORIZATION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EMAIL_AUTHORIZATION_CHANGE_EVENT, onStoreChange);
  };
};

const saveEmailAuthorizationToken = (token: string) => {
  window.localStorage.setItem(EMAIL_AUTHORIZATION_STORAGE_KEY, token);
  window.dispatchEvent(new Event(EMAIL_AUTHORIZATION_CHANGE_EVENT));
};

export default function DashboardWidgets() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userNameDraft, setUserNameDraft] = useState(DEFAULT_USER_NAME);
  const [hasSavedUserName, setHasSavedUserName] = useState(false);
  const [weatherCityDraft, setWeatherCityDraft] =
    useState(DEFAULT_WEATHER_CITY);
  const [hasSavedWeatherCity, setHasSavedWeatherCity] = useState(false);
  const [emailAuthorizationDraft, setEmailAuthorizationDraft] = useState("");
  const [hasSavedEmailAuthorization, setHasSavedEmailAuthorization] =
    useState(false);
  const settingsSnapshot = useSyncExternalStore(
    subscribeToWidgetSettings,
    getWidgetSettingsSnapshot,
    () => HYDRATING_WIDGET_SETTINGS_SNAPSHOT
  );
  const savedUserName = useSyncExternalStore(
    subscribeToUserName,
    getUserNameSnapshot,
    () => DEFAULT_USER_NAME
  );
  const savedGreetingPersonality = useSyncExternalStore(
    subscribeToGreetingPersonality,
    getGreetingPersonalitySnapshot,
    () => DEFAULT_GREETING_PERSONALITY
  );
  const savedWeatherCity = useSyncExternalStore(
    subscribeToWeatherCity,
    getWeatherCitySnapshot,
    () => DEFAULT_WEATHER_CITY
  );
  const savedEmailAuthorizationToken = useSyncExternalStore(
    subscribeToEmailAuthorization,
    getEmailAuthorizationSnapshot,
    () => ""
  );
  const settingsLoaded =
    settingsSnapshot !== HYDRATING_WIDGET_SETTINGS_SNAPSHOT;
  const settings = useMemo(
    () =>
      settingsLoaded
        ? parseWidgetSettingsSnapshot(settingsSnapshot)
        : DEFAULT_WIDGET_SETTINGS,
    [settingsLoaded, settingsSnapshot]
  );

  const widgetsById = useMemo(
    () => new Map(WIDGETS.map((widget) => [widget.id, widget])),
    []
  );

  const visibleSettings = settingsLoaded
    ? settings.filter((setting) => setting.enabled)
    : [];

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, []);

  const moveWidget = (widgetId: WidgetId, direction: -1 | 1) => {
    const currentSettings = parseWidgetSettingsSnapshot(
      getWidgetSettingsSnapshot()
    );
    const currentIndex = currentSettings.findIndex(
      (setting) => setting.id === widgetId
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= currentSettings.length
    ) {
      return;
    }

    const nextSettings = [...currentSettings];
    [nextSettings[currentIndex], nextSettings[nextIndex]] = [
      nextSettings[nextIndex],
      nextSettings[currentIndex],
    ];
    saveWidgetSettings(nextSettings);
  };

  const toggleWidget = (widgetId: WidgetId) => {
    const currentSettings = parseWidgetSettingsSnapshot(
      getWidgetSettingsSnapshot()
    );
    saveWidgetSettings(
      currentSettings.map((setting) =>
        setting.id === widgetId
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const saveEmailAuthorization = () => {
    saveEmailAuthorizationToken(emailAuthorizationDraft);
    setHasSavedEmailAuthorization(true);
  };

  const saveName = () => {
    saveUserName(userNameDraft);
    setUserNameDraft(normalizeUserName(userNameDraft));
    setHasSavedUserName(true);
  };

  const saveCity = () => {
    saveWeatherCity(weatherCityDraft);
    setWeatherCityDraft(normalizeWeatherCity(weatherCityDraft));
    setHasSavedWeatherCity(true);
  };

  const openSettings = () => {
    setUserNameDraft(getUserNameSnapshot());
    setHasSavedUserName(false);
    setWeatherCityDraft(getWeatherCitySnapshot());
    setHasSavedWeatherCity(false);
    setEmailAuthorizationDraft(getEmailAuthorizationSnapshot());
    setHasSavedEmailAuthorization(false);
    setIsSettingsOpen(true);
  };

  const userNameChanged = normalizeUserName(userNameDraft) !== savedUserName;
  const weatherCityChanged =
    normalizeWeatherCity(weatherCityDraft) !== savedWeatherCity;
  const emailAuthorizationChanged =
    emailAuthorizationDraft !== savedEmailAuthorizationToken;

  const settingsDrawer =
    isSettingsOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close widget settings"
              className="bg-black/35 backdrop-blur-[1px] transition-opacity duration-300"
              onClick={() => setIsSettingsOpen(false)}
              style={{
                bottom: 0,
                left: 0,
                position: "fixed",
                right: 0,
                top: 0,
                zIndex: 9000,
              }}
            />
            <aside
              aria-label="Widget settings"
              className="flex flex-col border-l border-white/15 bg-zinc-950/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl"
              style={{
                animation: "settings-drawer-slide-in 300ms ease-out",
                bottom: 0,
                boxSizing: "border-box",
                padding: "40px 32px 32px",
                position: "fixed",
                right: 0,
                top: 0,
                width: "min(25rem, 100vw)",
                zIndex: 9001,
              }}
            >
              <div
                className="flex items-start justify-between gap-3 border-b border-white/10"
                style={{ paddingBottom: 24 }}
              >
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">
                    Widgets
                  </h2>
                  <p className="mt-1 text-xs text-white/45">
                    Order and visibility
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  aria-label="Close settings"
                  title="Close settings"
                  className="grid size-8 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto"
                style={{ paddingTop: 24 }}
              >
                <div className="space-y-2">
                  {settings.map((setting, index) => {
                    const widget = widgetsById.get(setting.id);
                    if (!widget) return null;
                    const Icon = widget.icon;

                    return (
                      <div
                        key={setting.id}
                        className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3"
                        style={{ boxSizing: "border-box", width: "100%" }}
                      >
                        <GripVertical
                          size={15}
                          className="shrink-0 text-white/25"
                        />
                        <Icon size={16} className="shrink-0 text-blue-300" />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/85">
                          {widget.label}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveWidget(setting.id, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${widget.label} up`}
                            title={`Move ${widget.label} up`}
                            className="grid size-8 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveWidget(setting.id, 1)}
                            disabled={index === settings.length - 1}
                            aria-label={`Move ${widget.label} down`}
                            title={`Move ${widget.label} down`}
                            className="grid size-8 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWidget(setting.id)}
                            aria-pressed={setting.enabled}
                            aria-label={`${setting.enabled ? "Hide" : "Show"} ${
                              widget.label
                            }`}
                            title={`${setting.enabled ? "Hide" : "Show"} ${
                              widget.label
                            }`}
                            className={`grid size-8 place-items-center rounded-lg transition-colors ${
                              setting.enabled
                                ? "bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
                                : "bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60"
                            }`}
                          >
                            {setting.enabled ? (
                              <Eye size={15} />
                            ) : (
                              <EyeOff size={15} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <section
                  className="border-t border-white/10"
                  style={{ marginTop: 24, paddingTop: 24 }}
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Name
                    </h3>
                    <p className="mt-1 text-xs text-white/45">
                      Greeting display name
                    </p>
                  </div>
                  <div className="flex min-w-0 items-stretch gap-2">
                    <input
                      id="user-name"
                      type="text"
                      value={userNameDraft}
                      onChange={(event) => {
                        setUserNameDraft(event.target.value);
                        setHasSavedUserName(false);
                      }}
                      placeholder={DEFAULT_USER_NAME}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-300/70 focus:bg-white/[0.07]"
                      style={{ height: 44 }}
                      autoComplete="name"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={!userNameChanged}
                      aria-label="Save name"
                      title="Save name"
                      className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-400/15 text-blue-200 transition-colors hover:bg-blue-400/25 hover:text-white disabled:pointer-events-none disabled:bg-white/5 disabled:text-white/30"
                    >
                      <Save size={16} />
                    </button>
                  </div>

                  <p className="mt-2 min-h-4 text-xs text-emerald-300/85">
                    {hasSavedUserName ? "Saved" : " "}
                  </p>
                </section>

                <section
                  className="border-t border-white/10"
                  style={{ marginTop: 24, paddingTop: 24 }}
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Greeting Personality
                    </h3>
                    <p className="mt-1 text-xs text-white/45">
                      Phrase bank for the prompt
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      id="greeting-personality"
                      aria-label="Greeting personality"
                      value={savedGreetingPersonality}
                      onChange={(event) =>
                        saveGreetingPersonality(
                          normalizeGreetingPersonality(event.target.value)
                        )
                      }
                      className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 pr-10 text-sm font-bold text-white outline-none transition-colors hover:bg-white/[0.06] focus:border-blue-300/70 focus:bg-white/[0.07]"
                    >
                      {GREETING_PERSONALITY_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45"
                    />
                  </div>
                </section>

                <section
                  className="border-t border-white/10"
                  style={{ marginTop: 24, paddingTop: 24 }}
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Weather City
                    </h3>
                    <p className="mt-1 text-xs text-white/45">
                      Forecast location
                    </p>
                  </div>
                  <div className="flex min-w-0 items-stretch gap-2">
                    <input
                      id="weather-city"
                      type="text"
                      value={weatherCityDraft}
                      onChange={(event) => {
                        setWeatherCityDraft(event.target.value);
                        setHasSavedWeatherCity(false);
                      }}
                      placeholder={DEFAULT_WEATHER_CITY}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-300/70 focus:bg-white/[0.07]"
                      style={{ height: 44 }}
                      autoComplete="address-level2"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={saveCity}
                      disabled={!weatherCityChanged}
                      aria-label="Save weather city"
                      title="Save weather city"
                      className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-400/15 text-blue-200 transition-colors hover:bg-blue-400/25 hover:text-white disabled:pointer-events-none disabled:bg-white/5 disabled:text-white/30"
                    >
                      <Save size={16} />
                    </button>
                  </div>

                  <p className="mt-2 min-h-4 text-xs text-emerald-300/85">
                    {hasSavedWeatherCity ? "Saved" : " "}
                  </p>
                </section>

                <section
                  className="border-t border-white/10"
                  style={{ marginTop: 24, paddingTop: 24 }}
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Email authorization
                    </h3>
                    <p className="mt-1 text-xs text-white/45">
                      Access token for future email summary
                    </p>
                  </div>
                  <div className="flex min-w-0 items-stretch gap-2">
                    <input
                      id="email-authorization-token"
                      type="text"
                      value={emailAuthorizationDraft}
                      onChange={(event) => {
                        setEmailAuthorizationDraft(event.target.value);
                        setHasSavedEmailAuthorization(false);
                      }}
                      placeholder="Paste access token"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-300/70 focus:bg-white/[0.07]"
                      style={{ height: 44 }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={saveEmailAuthorization}
                      disabled={!emailAuthorizationChanged}
                      aria-label="Save email authorization"
                      title="Save email authorization"
                      className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-400/15 text-blue-200 transition-colors hover:bg-blue-400/25 hover:text-white disabled:pointer-events-none disabled:bg-white/5 disabled:text-white/30"
                    >
                      <Save size={16} />
                    </button>
                  </div>

                  <p className="mt-2 min-h-4 text-xs text-emerald-300/85">
                    {hasSavedEmailAuthorization ? "Saved" : " "}
                  </p>
                </section>
              </div>
            </aside>
            <style jsx global>{`
              @keyframes settings-drawer-slide-in {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }
            `}</style>
          </>,
          document.body
        )
      : null;

  return (
    <div
      className="relative z-10 flex min-h-screen flex-col px-8 py-16 md:px-16 md:py-20 lg:px-24"
      style={{ justifyContent: "safe center", minHeight: "100svh" }}
    >
      <main className="mx-auto w-full max-w-6xl">
        <header className="space-y-4">


          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-white md:text-7xl">
              Hello,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {savedUserName}
              </span>
            </h1>
            <DevGreeting />
          </div>

          <div className="pt-4">
            <DateWidget />
          </div>
        </header>

        <div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          style={{ marginTop: 40, gridAutoRows: 360 }}
        >
          {!settingsLoaded &&
            DEFAULT_WIDGET_SETTINGS.filter((setting) => setting.enabled).map(
              (setting) => (
                <div
                  key={setting.id}
                  aria-hidden="true"
                  className="invisible"
                />
              )
            )}

          {settingsLoaded &&
            visibleSettings.map((setting) => {
              const widget = widgetsById.get(setting.id);
              if (!widget) return null;
              const WidgetComponent = widget.Component;

              return (
                <div
                  key={setting.id}
                  className="min-h-0 overflow-hidden transition-transform duration-300 hover:scale-[1.02]"
                >
                  <WidgetComponent />
                </div>
              );
            })}
        </div>
      </main>

      <footer
        className="relative mx-auto w-full max-w-6xl px-8"
        style={{ height: 24, marginTop: 64 }}
      >
        <p
          className="whitespace-nowrap text-center text-xs font-mono uppercase tracking-[0.3em] text-zinc-500"
          style={{
            left: "50%",
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          Start Point Terminal v{APP_VERSION}
        </p>
        <button
          type="button"
          onClick={() =>
            isSettingsOpen ? setIsSettingsOpen(false) : openSettings()
          }
          aria-expanded={isSettingsOpen}
          aria-label="Open widget settings"
          title="Widget settings"
          className="flex items-center justify-center rounded-full p-0 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          style={{
            height: 44,
            minWidth: 44,
            position: "absolute",
            right: 20,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            zIndex: 20,
          }}
        >
          <Settings size={14} />
        </button>
      </footer>

      {settingsDrawer}
    </div>
  );
}
