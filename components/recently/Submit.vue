<script setup lang="ts">
import type { IPostActivity } from '~/types/activity'

const { callHanaMessage } = useMessage()

const visible = defineModel<boolean>()

const title = ref('')
const content = ref('')
const images = ref('')

// 音乐表单数据处理
const musicKeys = [
  { key: 'title', type: 'text', require: true },
  { key: 'src', type: 'text', require: true },
  { key: 'seconds', type: 'number', require: true },
  { key: 'albumTitle', type: 'text', require: true },
  { key: 'albumCover', type: 'text', require: true },
  { key: 'albumDescription', type: 'text', require: false },
] as const

type MusicKeys = typeof musicKeys[number]

type RequiredPart = {
  [K in Extract<MusicKeys, { require: true }> as K['key']]:
  K['type'] extends 'text' ? string
    : K['type'] extends 'number' ? number
      : never
}
type OptionalPart = {
  [K in Extract<MusicKeys, { require: false }> as K['key']]?:
  K['type'] extends 'text' ? string
    : K['type'] extends 'number' ? number
      : never
}
type MusicRecord = RequiredPart & OptionalPart

const musicDraft = ref<(Partial<MusicRecord>)[]>([])
function isCompleteMusic(draft: Partial<MusicRecord>): draft is MusicRecord {
  return musicKeys
    .filter(item => item.require)
    .every(item => draft[item.key] !== undefined && draft[item.key] !== '')
}

const music = computed(() => musicDraft.value.filter(isCompleteMusic).map(item => toRaw(item)))

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
  refreshNuxtData('home-activities')
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
      <HanaMultiForm v-model="musicDraft" :key-config="musicKeys" />
    </div>
    <div class="flex flex-col gap-4">
      <HanaButton class="w-full" dark-mode :disabled="publishing" @click="handlePublish">
        {{ buttonText }}
      </HanaButton>
    </div>
  </HanaDialog>
</template>
