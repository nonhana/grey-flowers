import type { MusicTrack } from '@grey-flowers/contracts';

import { create } from 'zustand';

export type PlayStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type LoopMode = 'off' | 'all' | 'one' | 'shuffle';

const VOLUME_STORAGE_KEY = 'gf.player.volume';
const LOOP_MODES: LoopMode[] = ['off', 'all', 'one', 'shuffle'];

const readStoredVolume = (): number => {
  const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (raw === null) return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 1;
};

interface PlayerState {
  currentIndex: number;
  currentTime: number;
  currentTrack: MusicTrack | null;
  duration: number;
  loopMode: LoopMode;
  muted: boolean;
  playlist: MusicTrack[];
  shuffleHistory: number[];
  status: PlayStatus;
  volume: number;
}

interface PlayerActions {
  cycleLoopMode: () => void;
  next: () => void;
  pause: () => void;
  play: (tracks: MusicTrack[], index?: number) => void;
  playById: (id: number) => void;
  prev: () => void;
  removeTrack: (trackId: number) => void;
  seek: (time: number) => void;
  setLoopMode: (mode: LoopMode) => void;
  setVolume: (value: number) => void;
  stop: () => void;
  toggle: () => void;
  toggleMute: () => void;
}

// 单例 AudioElement：模块加载即创建（未赋值 src 前无实际资源占用），跨路由常驻。
const audioElement = new Audio();
audioElement.volume = readStoredVolume();
audioElement.muted = false;
let playIntentActive = false;

export const usePlayerStore = create<PlayerState & PlayerActions>()((
  set,
  get,
) => {
  const randomIndex = () => {
    const { currentIndex, playlist } = get();
    if (playlist.length <= 1) return 0;
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    }
    return nextIndex;
  };

  const updateMediaSessionPosition = () => {
    if (!('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: get().duration || 0,
        playbackRate: 1,
        position: get().currentTime || 0,
      });
    } catch {
      // 位置更新失败可忽略
    }
  };

  const updateMediaSession = (track: MusicTrack) => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.cover ? [{ src: track.cover, sizes: '512x512' }] : [],
    });
    updateMediaSessionPosition();
  };

  const pause = () => {
    playIntentActive = false;
    audioElement.pause();
  };

  /** 恢复当前曲目（暂停后继续，或缓冲后重试）。 */
  const resume = () => {
    if (!get().currentTrack) return;
    playIntentActive = true;
    audioElement.play().catch(() => {
      playIntentActive = false;
      set({ status: 'error' });
    });
  };

  const seek = (time: number) => {
    const clamped = Math.max(0, Math.min(time, get().duration));
    audioElement.currentTime = clamped;
    set({ currentTime: clamped });
    updateMediaSessionPosition();
  };

  /** 换曲共用出口：写状态、赋值 src、开播、同步媒体会话。 */
  const loadTrack = (index: number) => {
    const track = get().playlist[index];
    if (!track) return;
    set({ currentIndex: index, currentTrack: track });
    playIntentActive = true;
    audioElement.src = track.src;
    audioElement.load();
    audioElement.play().catch(() => {
      playIntentActive = false;
      set({ status: 'error' });
    });
    updateMediaSession(track);
  };

  const playByIndex = (index: number) => {
    if (index < 0 || index >= get().playlist.length) return;
    loadTrack(index);
  };

  const next = () => {
    const { currentIndex, loopMode, playlist, shuffleHistory } = get();
    if (playlist.length === 0) return;
    if (loopMode === 'shuffle') {
      set({ shuffleHistory: [...shuffleHistory, currentIndex] });
      playByIndex(randomIndex());
      return;
    }
    playByIndex((currentIndex + 1) % playlist.length);
  };

  const prev = () => {
    const { currentIndex, currentTime, loopMode, playlist, shuffleHistory } =
      get();
    if (playlist.length === 0) return;
    // 播放超过 3 秒时，上一首回到本曲开头。
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (loopMode === 'shuffle' && shuffleHistory.length > 0) {
      const prevIndex = shuffleHistory[shuffleHistory.length - 1] ?? 0;
      set({ shuffleHistory: shuffleHistory.slice(0, -1) });
      playByIndex(prevIndex);
      return;
    }
    playByIndex(currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1);
  };

  const handleEnded = () => {
    const { currentIndex, loopMode, playlist } = get();
    switch (loopMode) {
      case 'one': {
        playIntentActive = true;
        audioElement.currentTime = 0;
        audioElement.play().catch(() => {
          playIntentActive = false;
          set({ status: 'error' });
        });
        break;
      }
      case 'all':
        next();
        break;
      case 'shuffle': {
        if (playlist.length > 0) {
          set({ shuffleHistory: [...get().shuffleHistory, currentIndex] });
          playByIndex(randomIndex());
        }
        break;
      }
      default: {
        if (currentIndex < playlist.length - 1) {
          next();
        } else {
          set({ status: 'paused' });
        }
      }
    }
  };

  const initAudioElement = () => {
    // 状态机沿用 HTML5 Media Element 规范：idle → loading → playing ↔ paused → error。
    audioElement.addEventListener('loadstart', () => {
      set({ status: 'loading' });
    });
    audioElement.addEventListener('waiting', () => {
      if (get().status === 'playing') set({ status: 'loading' });
    });
    audioElement.addEventListener('playing', () => {
      set({ status: 'playing' });
    });
    audioElement.addEventListener('pause', () => {
      // ended 前的 pause 交给 ended 处理。
      if (audioElement.ended) return;
      const status = get().status;
      if (status === 'playing' || (status === 'loading' && playIntentActive)) {
        playIntentActive = false;
        set({ status: 'paused' });
      }
    });
    audioElement.addEventListener('ended', () => {
      playIntentActive = false;
      handleEnded();
    });
    audioElement.addEventListener('error', () => {
      playIntentActive = false;
      set({ status: 'error' });
    });
    audioElement.addEventListener('timeupdate', () => {
      set({ currentTime: audioElement.currentTime });
    });
    audioElement.addEventListener('durationchange', () => {
      set({ duration: audioElement.duration });
    });
  };

  const setupMediaSessionHandlers = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', resume);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      seek(Math.max(0, get().currentTime - (details.seekOffset ?? 10)));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      seek(
        Math.min(
          get().duration,
          get().currentTime + (details.seekOffset ?? 10),
        ),
      );
    });
  };

  const toggle = () => {
    if (get().status === 'playing') {
      pause();
      return;
    }
    resume();
  };

  const setPlaylist = (tracks: MusicTrack[], startIndex = 0) => {
    set({ playlist: tracks, shuffleHistory: [] });
    if (tracks.length > 0) {
      playByIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
    }
  };

  /** 以某首曲目为起点进入播放列表（跨路由常驻）。 */
  const play = (tracks: MusicTrack[], index = 0) => {
    setPlaylist(tracks, index);
  };

  /** 在当前队列里按 id 播放（编辑/详情页跳转用）。 */
  const playById = (id: number) => {
    const index = get().playlist.findIndex((track) => track.id === id);
    if (index === -1) return;
    playByIndex(index);
  };

  const stop = () => {
    audioElement.pause();
    audioElement.currentTime = 0;
    playIntentActive = false;
    set({
      currentIndex: -1,
      currentTime: 0,
      currentTrack: null,
      duration: 0,
      status: 'idle',
    });
  };

  const setVolume = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    set({ volume: clamped });
    audioElement.volume = clamped;
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
  };

  const toggleMute = () => {
    const muted = !get().muted;
    set({ muted });
    audioElement.muted = muted;
  };

  const setLoopMode = (mode: LoopMode) => {
    set({
      loopMode: mode,
      ...(mode === 'shuffle' ? {} : { shuffleHistory: [] }),
    });
  };

  const cycleLoopMode = () => {
    const current = LOOP_MODES.indexOf(get().loopMode);
    const next = LOOP_MODES[(current + 1) % LOOP_MODES.length] ?? 'off';
    setLoopMode(next);
  };

  /**
   * 删除曲目：被删的是当前曲目则跳到队列中相邻一首继续播；
   * 队列因此为空则回到 idle。
   */
  const removeTrack = (trackId: number) => {
    const current = get();
    const index = current.playlist.findIndex((track) => track.id === trackId);
    if (index === -1) return;

    const wasCurrent = current.currentTrack?.id === trackId;
    const playlist = current.playlist.filter((track) => track.id !== trackId);
    const shuffleHistory = current.shuffleHistory
      .filter((historyIndex) => historyIndex !== index)
      .map((historyIndex) =>
        historyIndex > index ? historyIndex - 1 : historyIndex,
      );

    if (!wasCurrent) {
      set({
        currentIndex:
          current.currentIndex > index
            ? current.currentIndex - 1
            : current.currentIndex,
        playlist,
        shuffleHistory,
      });
      return;
    }

    if (playlist.length === 0) {
      stop();
      return;
    }
    set({ playlist, shuffleHistory });
    playByIndex(Math.min(index, playlist.length - 1));
  };

  initAudioElement();
  setupMediaSessionHandlers();

  return {
    currentIndex: -1,
    currentTime: 0,
    currentTrack: null,
    duration: 0,
    loopMode: 'off',
    muted: false,
    playlist: [],
    shuffleHistory: [],
    status: 'idle',
    volume: readStoredVolume(),
    cycleLoopMode,
    next,
    pause,
    play,
    playById,
    prev,
    removeTrack,
    seek,
    setLoopMode,
    setVolume,
    stop,
    toggle,
    toggleMute,
  };
});
