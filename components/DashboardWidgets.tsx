'use client';

import { ComponentType, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  CloudSun,
  Eye,
  EyeOff,
  GripVertical,
  Music,
  Newspaper,
  NotebookPen,
  Settings,
  X,
} from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';
import MusicWidget from '@/components/MusicWidget';
import NewsWidget from '@/components/NewsWidget';
import BookmarksWidget from '@/components/BookmarksWidget';
import NotesWidget from '@/components/NotesWidget';
import DateWidget from '@/components/DateWidget';
import DevGreeting from '@/components/DevGreeting';

type WidgetId = 'weather' | 'music' | 'news' | 'bookmarks' | 'notes';

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

const WIDGET_SETTINGS_STORAGE_KEY = 'start-point-widget-settings';
const WIDGET_SETTINGS_CHANGE_EVENT = 'start-point-widget-settings-change';

const WIDGETS: WidgetDefinition[] = [
  {
    id: 'weather',
    label: 'Weather',
    defaultEnabled: true,
    icon: CloudSun,
    Component: WeatherWidget,
  },
  {
    id: 'music',
    label: 'Music',
    defaultEnabled: true,
    icon: Music,
    Component: MusicWidget,
  },
  {
    id: 'news',
    label: 'News',
    defaultEnabled: true,
    icon: Newspaper,
    Component: NewsWidget,
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    defaultEnabled: false,
    icon: Bookmark,
    Component: BookmarksWidget,
  },
  {
    id: 'notes',
    label: 'Notes',
    defaultEnabled: false,
    icon: NotebookPen,
    Component: NotesWidget,
  },
];

const DEFAULT_WIDGET_SETTINGS: WidgetSetting[] = WIDGETS.map((widget) => ({
  id: widget.id,
  enabled: widget.defaultEnabled,
}));
const DEFAULT_WIDGET_SETTINGS_SNAPSHOT = JSON.stringify(DEFAULT_WIDGET_SETTINGS);
const HYDRATING_WIDGET_SETTINGS_SNAPSHOT = '__start-point-widget-settings-hydrating__';

const widgetIds = new Set<WidgetId>(WIDGETS.map((widget) => widget.id));

const isWidgetId = (value: unknown): value is WidgetId =>
  typeof value === 'string' && widgetIds.has(value as WidgetId);

const normalizeWidgetSettings = (value: unknown): WidgetSetting[] => {
  if (!Array.isArray(value)) return DEFAULT_WIDGET_SETTINGS;

  const savedSettings = value
    .filter((item): item is WidgetSetting => (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'enabled' in item &&
      isWidgetId(item.id) &&
      typeof item.enabled === 'boolean'
    ));

  const seen = new Set<WidgetId>();
  const orderedSettings = savedSettings.filter((setting) => {
    if (seen.has(setting.id)) return false;
    seen.add(setting.id);
    return true;
  });

  const missingSettings = DEFAULT_WIDGET_SETTINGS.filter((setting) => !seen.has(setting.id));

  return [...orderedSettings, ...missingSettings];
};

const getWidgetSettingsSnapshot = () => {
  if (typeof window === 'undefined') return DEFAULT_WIDGET_SETTINGS_SNAPSHOT;
  return window.localStorage.getItem(WIDGET_SETTINGS_STORAGE_KEY) ?? DEFAULT_WIDGET_SETTINGS_SNAPSHOT;
};

const subscribeToWidgetSettings = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(WIDGET_SETTINGS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
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
  window.localStorage.setItem(WIDGET_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(WIDGET_SETTINGS_CHANGE_EVENT));
};

export default function DashboardWidgets() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsSnapshot = useSyncExternalStore(
    subscribeToWidgetSettings,
    getWidgetSettingsSnapshot,
    () => HYDRATING_WIDGET_SETTINGS_SNAPSHOT
  );
  const settingsLoaded = settingsSnapshot !== HYDRATING_WIDGET_SETTINGS_SNAPSHOT;
  const settings = useMemo(
    () => settingsLoaded ? parseWidgetSettingsSnapshot(settingsSnapshot) : DEFAULT_WIDGET_SETTINGS,
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
    const currentSettings = parseWidgetSettingsSnapshot(getWidgetSettingsSnapshot());
    const currentIndex = currentSettings.findIndex((setting) => setting.id === widgetId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentSettings.length) {
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
    const currentSettings = parseWidgetSettingsSnapshot(getWidgetSettingsSnapshot());
    saveWidgetSettings(
      currentSettings.map((setting) =>
        setting.id === widgetId
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const settingsDrawer = isSettingsOpen && typeof document !== 'undefined' ? createPortal(
    <>
      <button
        type="button"
        aria-label="Close widget settings"
        className="bg-black/35 backdrop-blur-[1px] transition-opacity duration-300"
        onClick={() => setIsSettingsOpen(false)}
        style={{
          bottom: 0,
          left: 0,
          position: 'fixed',
          right: 0,
          top: 0,
          zIndex: 9000,
        }}
      />
      <aside
        aria-label="Widget settings"
        className="flex flex-col border-l border-white/15 bg-zinc-950/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl"
        style={{
          animation: 'settings-drawer-slide-in 300ms ease-out',
          bottom: 0,
          boxSizing: 'border-box',
          padding: '40px 32px 32px',
          position: 'fixed',
          right: 0,
          top: 0,
          width: 'min(25rem, 100vw)',
          zIndex: 9001,
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10" style={{ paddingBottom: 24 }}>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Widgets</h2>
            <p className="mt-1 text-xs text-white/45">Order and visibility</p>
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

        <div className="flex-1 overflow-y-auto" style={{ paddingTop: 24 }}>
          <div className="space-y-2">
            {settings.map((setting, index) => {
              const widget = widgetsById.get(setting.id);
              if (!widget) return null;
              const Icon = widget.icon;

              return (
                <div
                  key={setting.id}
                  className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3"
                  style={{ boxSizing: 'border-box', width: '100%' }}
                >
                  <GripVertical size={15} className="shrink-0 text-white/25" />
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
                      aria-label={`${setting.enabled ? 'Hide' : 'Show'} ${widget.label}`}
                      title={`${setting.enabled ? 'Hide' : 'Show'} ${widget.label}`}
                      className={`grid size-8 place-items-center rounded-lg transition-colors ${
                        setting.enabled
                          ? 'bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                          : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      {setting.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
  ) : null;

  return (
    <div
      className="relative z-10 min-h-screen px-8 md:px-16 lg:px-24"
      style={{ paddingBottom: 64, paddingTop: 80 }}
    >
      <main className="mx-auto w-full max-w-6xl">
        <header className="space-y-4">
          <div className="mb-4 inline-block rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 backdrop-blur-sm">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">
              System Status: Online
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-white md:text-7xl">
              Hello,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Patrick
              </span>
            </h1>
            <DevGreeting />
          </div>

          <div className="pt-8">
            <DateWidget />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 64 }}>
          {!settingsLoaded && DEFAULT_WIDGET_SETTINGS.filter((setting) => setting.enabled).map((setting) => (
            <div
              key={setting.id}
              aria-hidden="true"
              className="invisible h-[320px]"
            />
          ))}

          {settingsLoaded && visibleSettings.map((setting) => {
            const widget = widgetsById.get(setting.id);
            if (!widget) return null;
            const WidgetComponent = widget.Component;

            return (
              <div
                key={setting.id}
                className="h-[320px] transition-transform duration-300 hover:scale-[1.02]"
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
            left: '50%',
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          Start Point Terminal v1.0.1
        </p>
        <button
          type="button"
          onClick={() => setIsSettingsOpen((current) => !current)}
          aria-expanded={isSettingsOpen}
          aria-label="Open widget settings"
          title="Widget settings"
          className="flex items-center justify-center rounded-full p-0 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          style={{
            height: 44,
            minWidth: 44,
            position: 'absolute',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
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
