<script setup lang="ts">
import type { CommentItem } from '~/types/comment'
import { useStore } from '~/store'

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const visible = defineModel<boolean>()

const route = useRoute()
const { path } = toRefs(route)
watch(path, () => visible.value = false)

const comments = ref<CommentItem[]>([])

const fetching = ref(false)

async function fetchUserComments() {
  fetching.value = true
  const data = await $fetch('/api/user/comments', { query: { id: userInfo.value!.id } })
  if (data.success) {
    comments.value = data.payload ?? []
  }
  fetching.value = false
}

onMounted(fetchUserComments)
</script>

<template>
  <HanaDialog v-model="visible" title="你的评论...仅展示 10 条" width="800px">
    <div class="px-4">
      <CommentItem v-for="comment in comments" :key="comment.id" :comment="comment" record-mode />
      <div v-if="!fetching && !comments.length" class="flex w-full flex-col items-center justify-center gap-4 text-xl">
        <NuxtImg src="/images/not-found.webp" alt="空空如也" class="size-40 rounded-lg" />
        <span>空空如也...</span>
      </div>
    </div>
  </HanaDialog>
</template>
