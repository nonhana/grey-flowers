<script setup lang="ts">
import type { IPostActivity } from '~/types/activity'

const { callHanaMessage } = useMessage()

const visible = defineModel<boolean>()

const title = ref('')
const content = ref('')
const images = ref('')

const musicKeys = ['title', 'src', 'seconds', 'albumTitle', 'albumCover', 'albumDescription'] as const
type MusicKeys = typeof musicKeys[number]
type MusicRecord = Partial<Record<MusicKeys, string>>

const music = ref<MusicRecord[]>([])

const publishing = ref(false)
const buttonText = computed(() => publishing.value ? '发布中...' : '发布动态')

async function handlePublish() {
  if (!content.value) {
    callHanaMessage({
      message: '请填写动态内容。',
      type: 'error',
    })
    return
  }
  const objData: IPostActivity = {
    title: title.value,
    content: content.value,
    images: images.value.split(',').filter(Boolean),
    music: music.value,
  }
  publishing.value = true
  await publishActivity(objData)
  publishing.value = false
}

async function publishActivity(objData: IPostActivity) {
  const data = await $fetch('/api/activity/post', {
    method: 'POST',
    body: JSON.stringify(objData),
  })
  if (data.success) {
    title.value = ''
    content.value = ''
    visible.value = false
    callHanaMessage({
      message: '发布成功！',
      type: 'success',
    })
  }
  else {
    const errorList = data.error?.map(item => item.message).join(', ')
    callHanaMessage({
      type: 'error',
      message: errorList || data.statusMessage || '发布失败',
    })
  }
}
</script>

<template>
  <HanaDialog v-model="visible" title="发布动态" width="700px">
    <div class="mb-5 flex flex-col gap-4">
      <HanaInput v-model="title" placeholder="请输入动态标题" />
      <HanaInput v-model="content" type="textarea" placeholder="请输入动态内容" resize="none" :rows="8" />
      <HanaInput v-model="images" type="textarea" placeholder="请输入图片 url 地址，多个图片用 ',' 隔开" resize="none" :rows="8" />
      <HanaMultiForm v-model="music" :keys="musicKeys" />
    </div>
    <div class="flex flex-col gap-4">
      <HanaButton class="w-full" dark-mode :disabled="publishing" @click="handlePublish">
        {{ buttonText }}
      </HanaButton>
    </div>
  </HanaDialog>
</template>
