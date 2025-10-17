import type { Track } from '~/types/activity'

export type PlaybackState
  = | 'idle' // 初始状态或未加载任何音频
    | 'loading' // 音频正在加载
    | 'playing' // 正在播放
    | 'paused' // 播放已暂停
    | 'error' // 播放错误

export const useAudioPlayerStore = defineStore('audioPlayer', () => {
  const audio = new Audio()

  const currentTrack = ref<Track | null>(null)
  const playbackState = ref<PlaybackState>('idle')
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.2)
  const isMuted = ref(false)
  const isSeeking = ref(false)

  const eventFnMap = {
    play: () => {
      isPlaying.value = true
      playbackState.value = 'playing'
    },
    playing: () => {
      isPlaying.value = true
      playbackState.value = 'playing'
    },
    pause: () => {
      isPlaying.value = false
      playbackState.value = 'paused'
    },
    ended: () => {
      isPlaying.value = false
      playbackState.value = 'idle'
    },
    timeupdate: () => {
      currentTime.value = audio.currentTime
    },
    durationchange: () => {
      duration.value = audio.duration || 0
    },
    loadeddata: () => {
      duration.value = audio.duration || 0
    },
    error: () => {
      playbackState.value = 'error'
    },
    waiting: () => {
      playbackState.value = 'loading'
    },
    seeking: () => {
      isSeeking.value = true
    },
    seeked: () => {
      isSeeking.value = false
    },
  }

  /**
   * 绑定所有 audio 元素的原生事件
   */
  const attachEvents = () => {
    Object.entries(eventFnMap).forEach(([event, fn]) => {
      audio.addEventListener(event, fn)
    })
  }
})
