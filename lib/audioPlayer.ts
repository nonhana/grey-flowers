import type { Track } from '~/types/activity'

export type PlaybackState
  = | 'idle' // 未加载任何音频
    | 'loading' // 音频正在加载
    | 'playing' // 正在播放
    | 'paused' // 播放已暂停
    | 'error' // 播放错误

export interface PlayerState {
  currentTrack: Track | null
  playbackState: PlaybackState
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
}

export type Listener = (state: PlayerState) => void

export class AudioPlayer {
  private static instance: AudioPlayer

  // 获取单例
  public static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer()
    }
    return AudioPlayer.instance
  }

  private readonly audio: HTMLAudioElement
  private state: PlayerState
  private listeners: Set<Listener> = new Set()

  private constructor() {
    this.audio = new Audio()
    this.state = this.getInitialState()

    // 初始化状态
    this.audio.volume = this.state.volume

    this.attachEvents()
    this.updateMediaSessionPauseStatus(true)
  }

  /** 重置播放器状态 */
  public reset(): void {
    this.updateState(this.getInitialState())
  }

  /** 订阅播放器状态变化 */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /** 加载一首新歌并开始播放 */
  public async loadAndPlay(track: Track): Promise<void> {
    this.reset()
    this.updateState({ currentTrack: track, playbackState: 'loading' })
    this.updateMediaSessionMetadata(track)
    this.audio.src = track.src
    this.audio.load()

    try {
      await this.audio.play()
    }
    catch (error) {
      console.error('Autoplay failed:', error)
      this.updateState({ playbackState: 'paused' })
    }
  }

  /** 加载一首新歌 */
  public load(track: Track): void {
    this.reset()
    this.updateState({ currentTrack: track, playbackState: 'loading' })
    this.updateMediaSessionMetadata(track)
    this.audio.src = track.src
    this.audio.load()
  }

  /** 播放当前加载的音频 */
  public play(): void {
    if (this.state.currentTrack) {
      this.audio.play().catch(e => console.error('Play failed:', e))
    }
  }

  /** 暂停播放 */
  public pause(): void {
    this.audio.pause()
  }

  /** 切换播放/暂停状态 */
  public togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause()
    }
    else {
      this.play()
    }
  }

  /** 跳转到指定播放时间 */
  public seek(time: number): void {
    this.audio.currentTime = time
    this.updateState({ currentTime: time }) // 立即同步状态，实现伪双向绑定
  }

  /** 设置音量 */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.audio.volume = clampedVolume
    this.updateState({ volume: clampedVolume })
  }

  /** 切换静音状态 */
  public toggleMuted(): void {
    this.audio.muted = !this.audio.muted
    this.updateState({ isMuted: this.audio.muted })
  }

  /** 获取当前播放器状态的快照 */
  public getState(): PlayerState {
    return { ...this.state }
  }

  // 更新 Media Session 元数据
  public updateMediaSessionMetadata(track: Track) {
    if (!('mediaSession' in navigator))
      return

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        album: track.album,
        artwork: [
          {
            src: track.cover,
            sizes: '384x384',
            type: 'image/jpeg',
          },
        ],
      })
    }
    catch (error) {
      console.warn('Failed to update Media Session metadata:', error)
    }
  }

  // 注册 Media Session 事件处理器
  public registerMediaSessionHandlers(handlers: {
    onPlay: () => void
    onPause: () => void
    onPreviousTrack: () => void
    onNextTrack: () => void
  }) {
    if (!('mediaSession' in navigator))
      return

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        handlers.onPlay()
      })

      navigator.mediaSession.setActionHandler('pause', () => {
        handlers.onPause()
      })

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlers.onPreviousTrack()
      })

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handlers.onNextTrack()
      })

      navigator.mediaSession.playbackState = 'none'
    }
    catch (error) {
      console.warn('Failed to register Media Session handlers:', error)
    }
  }

  // 更新 Media Session 的播放状态
  public updateMediaSessionPauseStatus(isPaused: boolean) {
    if (!('mediaSession' in navigator))
      return

    try {
      navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing'
    }
    catch (error) {
      console.warn('Failed to update Media Session playback state:', error)
    }
  }

  /** 获取初始状态 */
  private getInitialState(): PlayerState {
    return {
      currentTrack: null,
      playbackState: 'idle',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.2,
      isMuted: false,
    }
  }

  /** 更新状态并通知所有订阅者 */
  private updateState(newState: Partial<PlayerState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  /** 通知所有订阅者状态已更新 */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

  /** 绑定所有 audio 元素的原生事件 */
  private attachEvents(): void {
    this.audio.addEventListener('play', this.handlePlay)
    this.audio.addEventListener('playing', this.handlePlaying)
    this.audio.addEventListener('pause', this.handlePause)
    this.audio.addEventListener('ended', this.handleEnded)
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate)
    this.audio.addEventListener('durationchange', this.handleDurationChange)
    this.audio.addEventListener('loadeddata', this.handleLoadedData)
    this.audio.addEventListener('error', this.handleError)
    this.audio.addEventListener('waiting', this.handleWaiting)
  }

  private handlePlaying = () => {
    this.updateState({ isPlaying: true, playbackState: 'playing' })
    this.updateMediaSessionPauseStatus(false)
  }

  private handlePlay = () => {
    this.updateState({ isPlaying: true, playbackState: 'playing' })
    this.updateMediaSessionPauseStatus(false)
  }

  private handlePause = () => {
    this.updateState({ isPlaying: false, playbackState: 'paused' })
    this.updateMediaSessionPauseStatus(true)
  }

  private handleEnded = () => {
    this.updateState({ isPlaying: false, playbackState: 'idle' })
    this.updateMediaSessionPauseStatus(true) // 播放结束，设为暂停状态
  }

  private handleTimeUpdate = () => this.updateState({ currentTime: this.audio.currentTime })
  private handleDurationChange = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleLoadedData = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleError = () => this.updateState({ playbackState: 'error' })
  private handleWaiting = () => this.updateState({ playbackState: 'loading' })
}
