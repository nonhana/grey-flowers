import { AudioPlayer } from '~/lib/audioPlayer'

export default defineNuxtPlugin(() => {
  const audioPlayer = AudioPlayer.getInstance()

  return {
    provide: {
      audioPlayer,
    },
  }
})
