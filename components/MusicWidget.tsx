'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';

const PLAYLIST = [
  { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio', isLive: true },
  { id: 'Na0w3Mz46GA', title: 'asian lofi radio', isLive: true },
  { id: '1fueZCTYkpA', title: 'Morning Coffee', isLive: false },
  { id: 'lTRiuFIWV54', title: '1 A.M Study Session', isLive: false },
  { id: 'rt1mRnRp79A', title: 'coffee & beats', isLive: false },
  { id: '2gliGzb2_1I', title: 'coffee to go!', isLive: false },
  { id: 'n61ULEU7CO0', title: 'Best of lofi 2021', isLive: false },
  { id: 'S-4hwfyK-XQ', title: 'winter lofi mix', isLive: false },
  { id: 'lA9FONoiuFA', title: 'Best of lofi 2024', isLive: false },
];

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

interface YTPlayerConfig {
  height: string;
  width: string;
  videoId: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady: (event: YTEvent) => void;
    onStateChange: (event: YTEvent) => void;
    onError: () => void;
  };
}

interface YTPlayer {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
}

interface YTEvent {
  target: YTPlayer;
  data: number;
}

export default function MusicWidget() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const playerRef = useRef<YTPlayer | null>(null);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const volumeRef = useRef(volume);

  // Keep refs in sync with state
  currentTrackIndexRef.current = currentTrackIndex;
  volumeRef.current = volume;

  const changeTrack = useCallback((index: number) => {
    if (!playerRef.current) return;
    setIsLoading(true);
    setCurrentTrackIndex(index);
    setProgress(0);
    setCurrentTime(0);
    playerRef.current.loadVideoById(PLAYLIST[index].id);
    playerRef.current.playVideo();
  }, []);

  const changeTrackRef = useRef(changeTrack);
  changeTrackRef.current = changeTrack;

  // Initialize player once — no dependencies, uses refs for current values
  useEffect(() => {
    let destroyed = false;

    const createPlayer = () => {
      if (destroyed || playerRef.current) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100',
        width: '100',
        videoId: PLAYLIST[0].id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: YTEvent) => {
            if (destroyed) return;
            setIsReady(true);
            setIsLoading(false);
            event.target.setVolume(volumeRef.current);
          },
          onStateChange: (event: YTEvent) => {
            if (destroyed) return;
            const state = event.data;
            if (state === 1) {
              setIsPlaying(true);
              setIsLoading(false);
            } else if (state === 2) {
              setIsPlaying(false);
              setIsLoading(false);
            } else if (state === 0) {
              // Track ended — play next
              setIsPlaying(false);
              const nextIndex = (currentTrackIndexRef.current + 1) % PLAYLIST.length;
              changeTrackRef.current(nextIndex);
            } else if (state === 3) {
              setIsLoading(true);
            } else {
              setIsLoading(false);
            }
          },
          onError: () => {
            if (destroyed) return;
            setIsLoading(false);
            const nextIndex = (currentTrackIndexRef.current + 1) % PLAYLIST.length;
            changeTrackRef.current(nextIndex);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress tracking
  useEffect(() => {
    if (!isPlaying || !playerRef.current || PLAYLIST[currentTrackIndex].isLive) return;

    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const current = playerRef.current.getCurrentTime();
      const total = playerRef.current.getDuration();
      setCurrentTime(current);
      setDuration(total);
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => {
    if (!isReady || !playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handlePrevious = () => {
    const prevIndex = (currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    changeTrack(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
    changeTrack(nextIndex);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (!isReady || !playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTrack = PLAYLIST[currentTrackIndex];

  return (
    <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      {/* Off-screen YouTube player */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '100px', height: '100px', pointerEvents: 'none' }}>
        <div id="youtube-player"></div>
      </div>

      {/* Mini Player */}
      <div className="flex items-center gap-3 mb-3">
        {/* Thumbnail */}
        <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden relative border border-white/10 shadow-lg">
          <img
            src={`https://i.ytimg.com/vi/${currentTrack.id}/mqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-zinc-950/40 flex items-center justify-center">
              <div className="flex items-end gap-[2px] h-4">
                <div className="w-[3px] rounded-full bg-emerald-400 animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: '60%' }} />
                <div className="w-[3px] rounded-full bg-emerald-400 animate-[music-bar_0.6s_ease-in-out_infinite]" style={{ height: '100%' }} />
                <div className="w-[3px] rounded-full bg-emerald-400 animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ height: '40%' }} />
              </div>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Now Playing</h3>
          <h4 className="text-sm font-black text-white truncate tracking-tight">{currentTrack.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              {currentTrack.isLive ? 'Live' : formatTime(currentTime) + ' / ' + formatTime(duration)}
            </p>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center text-zinc-950 transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(255,255,255,0.2)] disabled:opacity-50"
          disabled={!isReady}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Controls & Progress */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevious} className="text-white/40 hover:text-white transition-all active:scale-90" disabled={!isReady}>
            <SkipBack size={14} fill="currentColor" />
          </button>
          <button onClick={handleNext} className="text-white/40 hover:text-white transition-all active:scale-90" disabled={!isReady}>
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex-1">
          {!currentTrack.isLive ? (
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-full bg-red-500/40 animate-pulse rounded-full" />
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="text-zinc-500 hover:text-white transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-14 h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        <div className="space-y-1">
          {PLAYLIST.map((track, index) => (
            <button
              key={track.id}
              onClick={() => changeTrack(index)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group/item ${
                currentTrackIndex === index
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <div className="shrink-0 w-12 h-10 rounded-md overflow-hidden relative group/thumb border border-white/5">
                <img
                  src={`https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover/item:scale-110"
                />
                {currentTrackIndex === index ? (
                  <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
                    {isPlaying ? (
                      <div className="flex items-end gap-[1px] h-3">
                        <div className="w-0.5 bg-emerald-400 animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: '60%' }} />
                        <div className="w-0.5 bg-emerald-400 animate-[music-bar_0.6s_ease-in-out_infinite]" style={{ height: '100%' }} />
                        <div className="w-0.5 bg-emerald-400 animate-[music-bar_0.9s_ease-in-out_infinite]" style={{ height: '40%' }} />
                      </div>
                    ) : (
                      <Play size={12} className="text-white fill-white" />
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/20 group-hover/item:bg-black/0 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate tracking-tight">{track.title}</p>
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                  {track.isLive ? 'Live Station' : 'lofi mix'}
                </p>
              </div>
              {track.isLive && (
                <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes music-bar {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
