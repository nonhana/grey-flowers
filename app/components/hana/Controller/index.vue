<script lang="ts" setup>
import type { Track } from '#shared/types/activity'
import { useStore } from '~/stores'

const { dialogStore, uiInfoStore } = useStore()
const { scrollHeight, clientHeight } = toRefs(uiInfoStore)
const { progress } = useLoadingIndicator()
const route = useRoute()

const commentWhiteList = ['/recently']

const hasComments = ref(false)
const isClient = ref(false)
const isAudioIdle = ref(true)
const currentTrack = ref<Track | null>(null)
const volume = ref(0.2)
const isMuted = ref(false)

let commentCheckTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeAudioPlayer: (() => void) | null = null

const showAudioControls = computed(() => !isAudioIdle.value)
const showComment = computed(() =>
  dialogStore.dialogCount === 0
  && !commentWhiteList.includes(route.path)
  && hasComments.value,
)
const showScrollTop = computed(() =>
  dialogStore.dialogCount === 0
  && scrollHeight.value > clientHeight.value,
)
const showArticleDrawer = computed(() =>
  isClient.value
  && route.name === ARTICLE_DETAIL_PAGE
  && uiInfoStore.breakpoints.smaller('xl').value,
)

function clearCommentCheckTimer() {
  if (commentCheckTimer) {
    clearTimeout(commentCheckTimer)
    commentCheckTimer = null
  }
}

function updateCommentPresence() {
  if (commentWhiteList.includes(route.path)) {
    hasComments.value = false
    return
  }

  hasComments.value = !!document.querySelector('#comments')
}

function queueCommentPresenceCheck() {
  clearCommentCheckTimer()
  commentCheckTimer = setTimeout(() => {
    updateCommentPresence()
    commentCheckTimer = null
  }, 300)
}

onMounted(() => {
  isClient.value = true

  const { $audioPlayer } = useNuxtApp()
  unsubscribeAudioPlayer = $audioPlayer.subscribe((state) => {
    currentTrack.value = state.currentTrack
    volume.value = state.volume
    isMuted.value = state.isMuted
    isAudioIdle.value = state.playbackState === 'idle'
  })

  queueCommentPresenceCheck()
})

onUnmounted(() => {
  clearCommentCheckTimer()
  unsubscribeAudioPlayer?.()
})

watch(progress, (newValue) => {
  if (newValue === 100) {
    queueCommentPresenceCheck()
  }
})

watch(() => route.path, () => {
  if (commentWhiteList.includes(route.path)) {
    clearCommentCheckTimer()
    hasComments.value = false
    return
  }

  queueCommentPresenceCheck()
})
</script>

<template>
  <transition-group
    name="controller"
    tag="div"
    class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 md:bottom-10 md:right-10 md:gap-4"
  >
    <div v-if="showAudioControls" key="player">
      <HanaControllerPlayer :current-track="currentTrack" />
    </div>
    <div v-if="showAudioControls" key="volume">
      <HanaControllerVolume :volume="volume" :is-muted="isMuted" />
    </div>
    <div v-if="showComment" key="comment">
      <HanaControllerComment />
    </div>
    <div v-if="showScrollTop" key="scroll-top">
      <HanaControllerScrollTop />
    </div>
    <div v-if="showArticleDrawer" key="article-drawer">
      <HanaControllerArticleDrawer />
    </div>
  </transition-group>
</template>

<style scoped>
.controller-move {
  transition: transform 0.3s ease;
}

.controller-enter-active,
.controller-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.controller-enter-from,
.controller-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.controller-leave-active {
  position: absolute;
  right: 0;
}
</style>
