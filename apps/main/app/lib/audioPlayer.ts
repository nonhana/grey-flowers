import type { Track } from '#shared/types/activity'

export type PlaybackState
  = | 'idle'
    | 'loading'
    | 'playing'
    | 'paused'
    | 'error'

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

    this.audio.volume = this.state.volume
    this.audio.muted = this.state.isMuted

    this.attachEvents()
    this.clearMediaSession()
  }

  public reset(): void {
    this.audio.pause()
    this.audio.currentTime = 0
    this.audio.removeAttribute('src')
    this.audio.load()

    this.clearMediaSession()
    this.updateState(this.getIdleState())
  }

  public stop(): void {
    this.reset()
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

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

  public load(track: Track): void {
    this.reset()
    this.updateState({ currentTrack: track, playbackState: 'loading' })
    this.updateMediaSessionMetadata(track)
    this.audio.src = track.src
    this.audio.load()
  }

  public play(): void {
    if (this.state.currentTrack) {
      this.audio.play().catch(e => console.error('Play failed:', e))
    }
  }

  public pause(): void {
    this.audio.pause()
  }

  public togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause()
    }
    else {
      this.play()
    }
  }

  public seek(time: number): void {
    this.audio.currentTime = time
    this.updateState({ currentTime: time }) // 立即同步状态，实现伪双向绑定
  }

  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.audio.volume = clampedVolume
    this.updateState({ volume: clampedVolume })
  }

  public setMuted(muted: boolean): void {
    this.audio.muted = muted
    this.updateState({ isMuted: muted })
  }

  public toggleMuted(): void {
    this.setMuted(!this.audio.muted)
  }

  public getState(): PlayerState {
    return { ...this.state }
  }

  private clearMediaSession() {
    if (!('mediaSession' in navigator))
      return

    try {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
    catch (error) {
      console.warn('Failed to clear Media Session:', error)
    }
  }

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

  private getInitialState(): PlayerState {
    return {
      ...this.getIdleState(),
      volume: 0.2,
      isMuted: false,
    }
  }

  private getIdleState(): Omit<PlayerState, 'volume' | 'isMuted'> {
    return {
      currentTrack: null,
      playbackState: 'idle',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }
  }

  private updateState(newState: Partial<PlayerState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

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

  private handleEnded = () => this.stop()

  private handleTimeUpdate = () => this.updateState({ currentTime: this.audio.currentTime })
  private handleDurationChange = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleLoadedData = () => this.updateState({ duration: this.audio.duration || 0 })
  private handleError = () => this.updateState({ playbackState: 'error' })
  private handleWaiting = () => this.updateState({ playbackState: 'loading' })
}
