<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    imgUrl: string
    imgAlt?: string
    maskBgColor?: string
    animationDuration?: number
    width?: number | string
    height?: number | string
  }>(),
  {
    maskBgColor: 'rgba(0, 0, 0, 0.1)',
    animationDuration: 500,
  },
)

const displaying = ref(false) // 是否正在查看大图
const imgRef = ref<HTMLImageElement | null>(null) // 原图片 DOM

const {
  generateMask,
  generateNewImg,
  handleWheel,
  clearDOM,
} = useImgViewer(imgRef, props)

// 切换查看大图状态
function toggleDisplay() {
  if (displaying.value) {
    clearDOM()
    setTimeout(() => {
      displaying.value = false
      document.body.style.overflow = 'auto'
      window.removeEventListener('wheel', handleWheel)
    }, props.animationDuration)
  }
  else {
    displaying.value = true
    document.body.style.overflow = 'hidden'
    window.addEventListener('wheel', handleWheel)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && displaying.value) {
    toggleDisplay()
  }
}

// 点击原图片
function handleClick() {
  if (imgRef.value) {
    toggleDisplay()
    generateMask(toggleDisplay)
    generateNewImg()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="relative m-auto flex max-w-[60%] flex-col items-center gap-2 object-cover text-sm text-text">
    <img
      ref="imgRef"
      :src="imgUrl"
      alt="demo-img"
      class="cursor-pointer"
      :style="{ visibility: displaying ? 'hidden' : 'visible' }"
      @click="handleClick"
    >
    <span v-if="imgAlt">{{ imgAlt }}</span>
  </div>
</template>
