<script setup lang="ts">
import { useStore } from '~/store'

const props = defineProps<{
  scrollTop: number // 当前整个容器的滚动偏移量，只接收不修改
  scrollHeight: number
  clientHeight: number
}>()

const { dialogStore } = useStore()
const { dialogCount } = toRefs(dialogStore)

const route = useRoute()
const { path } = toRefs(route)

// #region 滚动相关逻辑
const { progress } = useLoadingIndicator()
const canScroll = ref(false)

watchEffect(() => {
  canScroll.value = props.scrollHeight > props.clientHeight
})

const curScrollPercent = computed(() => {
  const percent = Math.ceil((props.scrollTop / (props.scrollHeight - props.clientHeight)) * 100)
  return Math.min(percent, 100)
})

const showPercent = ref(true)
function toggleShowPercent() {
  showPercent.value = !showPercent.value
}
// #endregion

// #region 评论相关逻辑
const commentWhiteList = ['/recently'] // 在白名单中的路径不显示评论

const hasComments = ref(false)

function checkCommentsExistence() {
  if (commentWhiteList.includes(path.value))
    return null
  const commentsElement = document.querySelector('#comments')
  hasComments.value = !!commentsElement
  return commentsElement
}

onMounted(() => {
  setTimeout(() => {
    checkCommentsExistence()
  }, 300)
})

watch(progress, (newV) => {
  if (newV === 100) {
    setTimeout(() => {
      checkCommentsExistence()
    }, 300)
  }
})

function scrollToComments() {
  const commentsElement = checkCommentsExistence()
  if (commentsElement) {
    commentsElement.scrollIntoView({ behavior: 'smooth' })
  }
}

function scrollToTop() {
  const contentWrapper = document.getElementById('global-scroll-view-wrapper')
  if (contentWrapper) {
    contentWrapper.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
}
// #endregion

// #region 音量控制相关逻辑
const isIdle = ref(true)
const volume = ref(0)
const previousVolume = ref(0)

const volumeIcon = computed(() =>
  volume.value > 0.5 ? 'lucide:volume-2' : volume.value > 0 ? 'lucide:volume-1' : 'lucide:volume-off',
)

onMounted(() => {
  const { $audioPlayer } = useNuxtApp()

  const unsubscribeIdle = $audioPlayer.subscribe((state) => {
    isIdle.value = state.playbackState === 'idle'
  })

  const unsubscribeVolume = $audioPlayer.subscribe((state) => {
    volume.value = state.volume
  })

  onUnmounted(() => {
    unsubscribeIdle()
    unsubscribeVolume()
  })
})

function toggleMuted() {
  const { $audioPlayer } = useNuxtApp()
  if ($audioPlayer.getState().isMuted) {
    $audioPlayer.setVolume(previousVolume.value)
  }
  else {
    previousVolume.value = volume.value
    $audioPlayer.setVolume(0)
  }
}

const showVolumePanel = ref(false)
function toggleShowVolumePanel() {
  showVolumePanel.value = !showVolumePanel.value
}

const controllerHeight = computed(() => showVolumePanel.value ? '208px' : '56px')

function handleInput(e: Event) {
  const { $audioPlayer } = useNuxtApp()
  const target = e.target as HTMLInputElement
  $audioPlayer.setVolume(target.valueAsNumber)
}
// #endregion
</script>

<template>
  <transition-group name="controller" tag="div" class="fixed bottom-10 right-10 flex flex-col gap-4">
    <div
      v-if="dialogCount === 0 && !isIdle"
      class="relative w-14 overflow-hidden hana-card transition-all duration-300"
      :style="{ height: controllerHeight }"
      @mouseenter="toggleShowVolumePanel"
      @mouseleave="toggleShowVolumePanel"
    >
      <div class="absolute bottom-2 flex flex-col items-center gap-4">
        <p class="text-xs text-text dark:text-hana-white-700">
          {{ Math.round(volume * 100) }}%
        </p>
        <input
          id="volume-progress"
          class="h-24 w-2 rounded outline-none transition-[box-shadow] duration-200 accent-hana-blue dark:bg-hana-black-700 focus-visible:ring-2 focus-visible:ring-hana-blue-300"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          :aria-valuemin="0"
          :aria-valuemax="1"
          :aria-valuenow="volume"
          aria-label="音量"
          :style="`--progress: ${volume}`"
          @input="handleInput"
        >
        <div
          class="mt-auto size-10 hana-button items-end items-center justify-center font-bold"
          @click="toggleMuted"
        >
          <icon :name="volumeIcon" size="20" />
        </div>
      </div>
    </div>

    <div v-if="dialogCount === 0 && hasComments" class="relative hana-card">
      <HanaTooltip content="滚到评论" position="left" animation="slide">
        <div class="size-10 hana-button items-center justify-center font-bold" @click="scrollToComments">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h.01" />
            <path d="M12 12h.01" />
            <path d="M16 12h.01" />
          </svg>
        </div>
      </HanaTooltip>
    </div>

    <div v-if="dialogCount === 0 && canScroll" class="relative hana-card">
      <HanaTooltip content="返回顶部" position="left" animation="slide">
        <div
          class="size-10 hana-button items-center justify-center font-bold"
          @click="scrollToTop"
          @mouseenter="toggleShowPercent"
          @mouseleave="toggleShowPercent"
        >
          <span class="absolute" :class="{ 'opacity-0': !showPercent }">{{ curScrollPercent }}%</span>
          <svg class="absolute" :class="{ 'opacity-0': showPercent }" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l7-7l7 7m-7 7V5" />
          </svg>
        </div>
      </HanaTooltip>
    </div>
  </transition-group>
</template>

<style scoped>
.controller-move,
.controller-enter-active,
.controller-leave-active {
  transition: all 0.3s ease;
}

.controller-enter-from,
.controller-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.controller-leave-active {
  position: absolute;
}

#volume-progress {
  background: linear-gradient(to right,
    oklch(0.5 0.1102 250.04) calc(var(--progress) * 100%),
    oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
  );
  writing-mode: vertical-lr;
  direction: rtl;
}

.dark {
  #volume-progress {
    background: linear-gradient(to right,
      oklch(0.75 0.0883 226.04) calc(var(--progress) * 100%),
      oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
    );
  }
}
</style>
