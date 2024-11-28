<script setup lang="ts">
import { useStore } from '~/store'
import type { MessageItem } from '~/types/message'

const props = withDefaults(defineProps<{
  index?: number
  message: MessageItem
}>(), {
  index: 0,
})

const { userStore } = useStore()
const isMe = computed(() => props.message.author!.id === userStore.userInfo?.id)

const opacity = ref(0)
const top = ref('10px')

function resetAnimation() {
  opacity.value = 0
  top.value = '10px'
  setTimeout(() => {
    opacity.value = 1
    top.value = '0'
  }, 0)
}

onMounted(() => {
  resetAnimation()
})

watch(() => props.index, () => resetAnimation)
</script>

<template>
  <div
    class="relative flex max-w-[80%] items-start gap-2 md:gap-5"
    :class="{ 'flex-row-reverse self-end': isMe }"
    :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, top }"
  >
    <div class="flex flex-col items-center gap-2">
      <NuxtImg v-if="message.author!.avatar" :src="message.author!.avatar" width="40" height="40" class="cursor-pointer rounded-full" />
      <div v-else class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-hana-blue text-xl text-white">
        <span>{{ message.author!.username[0] }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-sm text-text" :class="{ 'self-end': isMe }">
        <NuxtLink v-if="message.author!.site" :to="message.author!.site">
          <span>{{ message.author!.username }}</span>
        </NuxtLink>
        <span v-else>{{ message.author!.username }}</span>
      </div>
      <div v-if="message.parent" class="flex self-end text-text">
        <div class="line-clamp-1 max-w-40">
          <span>{{ message.parent.content }}</span>
        </div>
        <Icon name="material-symbols:reply" />
      </div>
      <div
        class="w-fit rounded-lg p-3"
        :class="[isMe ? 'self-end bg-hana-blue-400 text-white' : 'bg-white text-text']"
      >
        <span class="whitespace-pre-wrap">{{ message.content }}</span>
      </div>
      <div class="self-end text-sm text-text">
        <span>{{ message.publishedAt }}</span>
      </div>
    </div>
  </div>
</template>
