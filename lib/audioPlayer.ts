import type { Track } from '~/types/activity'

export type PlaybackState
  = | 'idle' // 初始状态或未加载任何音频
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

/**
 * 订阅者函数类型，用于接收状态更新
 */
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

    this.attachEvents()
  }

  /**
   * 订阅播放器状态变化
   * @param listener - 当状态变化时调用的回调函数
   * @returns 返回一个取消订阅的函数，用于组件卸载时清理
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 加载一首新歌并开始播放
   * @param track - 要播放的曲目对象
   */
  public async loadAndPlay(track: Track): Promise<void> {
    this.updateState({ currentTrack: track, playbackState: 'loading' })
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

  /**
   * 加载一首新歌
   * @param track - 要播放的曲目对象
   */
  public load(track: Track): void {
    this.updateState({ currentTrack: track, playbackState: 'loading' })
    this.audio.src = track.src
    this.audio.load()
  }

  /**
   * 播放当前加载的音频
   */
  public play(): void {
    if (this.state.currentTrack) {
      this.audio.play().catch(e => console.error('Play failed:', e))
    }
  }

  /**
   * 暂停播放
   */
  public pause(): void {
    this.audio.pause()
  }

  /**
   * 切换播放/暂停状态
   */
  public togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause()
    }
    else {
      this.play()
    }
  }

  /**
   * 跳转到指定播放时间
   * @param time - 秒数
   */
  public seek(time: number): void {
    this.audio.currentTime = time
  }

  /**
   * 设置音量
   * @param volume - 0 到 1 之间的数值
   */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.audio.volume = clampedVolume
    this.updateState({ volume: clampedVolume, isMuted: clampedVolume === 0 })
  }

  /**
   * 获取当前播放器状态的快照
   */
  public getState(): PlayerState {
    return { ...this.state }
  }

  /**
   * 获取初始状态
   */
  private getInitialState(): PlayerState {
    return {
      currentTrack: null,
      playbackState: 'idle',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
    }
  }

  /**
   * 更新状态并通知所有订阅者
   * @param newState - Partial<PlayerState> 允许我们只传入需要更新的部分状态
   */
  private updateState(newState: Partial<PlayerState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  /**
   * 通知所有订阅者状态已更新
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

  /**
   * 绑定所有 audio 元素的原生事件
   */
  private attachEvents(): void {
    this.audio.addEventListener('play', this.handlePlay)
    this.audio.addEventListener('pause', this.handlePause)
    this.audio.addEventListener('ended', this.handleEnded)
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate)
    this.audio.addEventListener('durationchange', this.handleDurationChange)
    this.audio.addEventListener('loadeddata', this.handleLoadedData)
    this.audio.addEventListener('error', this.handleError)
    this.audio.addEventListener('waiting', this.handleWaiting)
  }

  private handlePlay = () => this.updateState({ isPlaying: true, playbackState: 'playing' })
  private handlePause = () => this.updateState({ isPlaying: false, playbackState: 'paused' })
  private handleEnded = () => {
    this.updateState({ isPlaying: false, playbackState: 'idle' })
  }

  private handleTimeUpdate = () => this.updateState({ currentTime: this.audio.currentTime })
  private handleDurationChange = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleLoadedData = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleError = () => this.updateState({ playbackState: 'error' })
  private handleWaiting = () => this.updateState({ playbackState: 'loading' })
}
