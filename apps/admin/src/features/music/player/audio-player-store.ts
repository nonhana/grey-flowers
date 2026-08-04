import type { MusicTrack } from '@grey-flowers/contracts';

import { useSyncExternalStore } from 'react';

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

export interface AudioPlayerView {
  currentIndex: number;
  currentTime: number;
  currentTrack: MusicTrack | null;
  duration: number;
  hasNext: boolean;
  hasPrev: boolean;
  loopMode: LoopMode;
  muted: boolean;
  playlist: MusicTrack[];
  progress: number;
  status: PlayStatus;
  volume: number;
}

const createInitialState = (): PlayerState => ({
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
});

let state: PlayerState = createInitialState();
let view: AudioPlayerView;
const listeners = new Set<() => void>();

// 单例 AudioElement：模块加载即创建（未赋值 src 前无实际资源占用），跨路由常驻。
const audioElement = new Audio();
let playIntentActive = false;

const computeView = (): AudioPlayerView => {
  const hasPlaylist = state.playlist.length > 0;
  const hasPrev = hasPlaylist
    ? state.loopMode === 'shuffle'
      ? state.shuffleHistory.length > 0 || state.currentTime > 3
      : true
    : false;
  const hasNext = hasPlaylist
    ? state.loopMode === 'off'
      ? state.currentIndex < state.playlist.length - 1
      : true
    : false;

  return {
    currentIndex: state.currentIndex,
    currentTime: state.currentTime,
    currentTrack: state.currentTrack,
    duration: state.duration,
    hasNext,
    hasPrev,
    loopMode: state.loopMode,
    muted: state.muted,
    playlist: state.playlist,
    progress:
      state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0,
    status: state.status,
    volume: state.volume,
  };
};

view = computeView();

const emit = () => {
  view = computeView();
  listeners.forEach((listener) => listener());
};

const setState = (patch: Partial<PlayerState>) => {
  state = { ...state, ...patch };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): AudioPlayerView => view;

const randomIndex = () => {
  if (state.playlist.length <= 1) return 0;
  let nextIndex = state.currentIndex;
  while (nextIndex === state.currentIndex) {
    nextIndex = Math.floor(Math.random() * state.playlist.length);
  }
  return nextIndex;
};

const updateMediaSessionPosition = () => {
  if (!('mediaSession' in navigator)) return;
  if (!('setPositionState' in navigator.mediaSession)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: state.duration || 0,
      playbackRate: 1,
      position: state.currentTime || 0,
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

function pause() {
  playIntentActive = false;
  audioElement.pause();
}

/** 恢复当前曲目（暂停后继续，或缓冲后重试）。 */
function resume() {
  if (!state.currentTrack) return;
  playIntentActive = true;
  audioElement.play().catch(() => {
    playIntentActive = false;
    setState({ status: 'error' });
  });
}

function seek(time: number) {
  const clamped = Math.max(0, Math.min(time, state.duration));
  audioElement.currentTime = clamped;
  setState({ currentTime: clamped });
  updateMediaSessionPosition();
}

/** 换曲共用出口：写状态、赋值 src、开播、同步媒体会话。 */
function loadTrack(index: number) {
  const track = state.playlist[index];
  if (!track) return;
  setState({ currentIndex: index, currentTrack: track });
  playIntentActive = true;
  audioElement.src = track.src;
  audioElement.load();
  audioElement.play().catch(() => {
    playIntentActive = false;
    setState({ status: 'error' });
  });
  updateMediaSession(track);
}

function playByIndex(index: number) {
  if (index < 0 || index >= state.playlist.length) return;
  loadTrack(index);
}

function next() {
  if (state.playlist.length === 0) return;
  if (state.loopMode === 'shuffle') {
    setState({
      shuffleHistory: [...state.shuffleHistory, state.currentIndex],
    });
    playByIndex(randomIndex());
    return;
  }
  playByIndex((state.currentIndex + 1) % state.playlist.length);
}

function prev() {
  if (state.playlist.length === 0) return;
  // 播放超过 3 秒时，上一首回到本曲开头。
  if (state.currentTime > 3) {
    seek(0);
    return;
  }
  if (state.loopMode === 'shuffle' && state.shuffleHistory.length > 0) {
    const prevIndex =
      state.shuffleHistory[state.shuffleHistory.length - 1] ?? 0;
    setState({ shuffleHistory: state.shuffleHistory.slice(0, -1) });
    playByIndex(prevIndex);
    return;
  }
  playByIndex(
    state.currentIndex <= 0
      ? state.playlist.length - 1
      : state.currentIndex - 1,
  );
}

const handleEnded = () => {
  switch (state.loopMode) {
    case 'one': {
      playIntentActive = true;
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        playIntentActive = false;
        setState({ status: 'error' });
      });
      break;
    }
    case 'all':
      next();
      break;
    case 'shuffle': {
      if (state.playlist.length > 0) {
        setState({
          shuffleHistory: [...state.shuffleHistory, state.currentIndex],
        });
        playByIndex(randomIndex());
      }
      break;
    }
    default: {
      if (state.currentIndex < state.playlist.length - 1) {
        next();
      } else {
        setState({ status: 'paused' });
      }
    }
  }
};

const initAudioElement = () => {
  audioElement.volume = state.volume;
  audioElement.muted = state.muted;

  // 状态机沿用 HTML5 Media Element 规范：idle → loading → playing ↔ paused → error。
  audioElement.addEventListener('loadstart', () => {
    setState({ status: 'loading' });
  });
  audioElement.addEventListener('waiting', () => {
    if (state.status === 'playing') setState({ status: 'loading' });
  });
  audioElement.addEventListener('playing', () => {
    setState({ status: 'playing' });
  });
  audioElement.addEventListener('pause', () => {
    // ended 前的 pause 交给 ended 处理。
    if (audioElement.ended) return;
    if (
      state.status === 'playing' ||
      (state.status === 'loading' && playIntentActive)
    ) {
      playIntentActive = false;
      setState({ status: 'paused' });
    }
  });
  audioElement.addEventListener('ended', () => {
    playIntentActive = false;
    handleEnded();
  });
  audioElement.addEventListener('error', () => {
    playIntentActive = false;
    setState({ status: 'error' });
  });
  audioElement.addEventListener('timeupdate', () => {
    setState({ currentTime: audioElement.currentTime });
  });
  audioElement.addEventListener('durationchange', () => {
    setState({ duration: audioElement.duration });
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
    seek(Math.max(0, state.currentTime - (details.seekOffset ?? 10)));
  });
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    seek(
      Math.min(state.duration, state.currentTime + (details.seekOffset ?? 10)),
    );
  });
};

function toggle() {
  if (state.status === 'playing') {
    pause();
    return;
  }
  resume();
}

function setPlaylist(tracks: MusicTrack[], startIndex = 0) {
  setState({ playlist: tracks, shuffleHistory: [] });
  if (tracks.length > 0) {
    playByIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
  }
}

/** 以某首曲目为起点进入播放列表（跨路由常驻）。 */
function play(tracks: MusicTrack[], index = 0) {
  setPlaylist(tracks, index);
}

/** 在当前队列里按 id 播放（编辑/详情页跳转用）。 */
function playById(id: number) {
  const index = state.playlist.findIndex((track) => track.id === id);
  if (index === -1) return;
  playByIndex(index);
}

function stop() {
  audioElement.pause();
  audioElement.currentTime = 0;
  playIntentActive = false;
  setState({
    currentIndex: -1,
    currentTime: 0,
    currentTrack: null,
    duration: 0,
    status: 'idle',
  });
}

function setVolume(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  setState({ volume: clamped });
  audioElement.volume = clamped;
  localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
}

function toggleMute() {
  const muted = !state.muted;
  setState({ muted });
  audioElement.muted = muted;
}

function setLoopMode(mode: LoopMode) {
  setState({
    loopMode: mode,
    ...(mode === 'shuffle' ? {} : { shuffleHistory: [] }),
  });
}

function cycleLoopMode() {
  const current = LOOP_MODES.indexOf(state.loopMode);
  const next = LOOP_MODES[(current + 1) % LOOP_MODES.length] ?? 'off';
  setLoopMode(next);
}

/**
 * 删除曲目：被删的是当前曲目则跳到队列中相邻一首继续播；
 * 队列因此为空则回到 idle。
 */
function removeTrack(trackId: number) {
  const index = state.playlist.findIndex((track) => track.id === trackId);
  if (index === -1) return;

  const wasCurrent = state.currentTrack?.id === trackId;
  const playlist = state.playlist.filter((track) => track.id !== trackId);
  const shuffleHistory = state.shuffleHistory
    .filter((historyIndex) => historyIndex !== index)
    .map((historyIndex) =>
      historyIndex > index ? historyIndex - 1 : historyIndex,
    );

  if (!wasCurrent) {
    setState({
      currentIndex:
        state.currentIndex > index
          ? state.currentIndex - 1
          : state.currentIndex,
      playlist,
      shuffleHistory,
    });
    return;
  }

  if (playlist.length === 0) {
    stop();
    return;
  }
  setState({ playlist, shuffleHistory });
  playByIndex(Math.min(index, playlist.length - 1));
}

initAudioElement();
setupMediaSessionHandlers();

export const audioPlayer = {
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

export const useAudioPlayer = (): AudioPlayerView => {
  return useSyncExternalStore(subscribe, getSnapshot);
};
