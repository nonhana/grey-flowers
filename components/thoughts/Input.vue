<script setup lang="ts">
const emits = defineEmits<{
  (e: 'published'): void
}>()

const { callHanaMessage } = useMessage()

const value = ref('')

async function handlePublish() {
  if (value.value === '') {
    callHanaMessage({
      type: 'error',
      message: '内容不能为空',
    })
    return
  }
  const objData = {
    content: value.value,
  }
  const { data } = await useAsyncData('post-message', () => $fetch('/api/messages/post', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    method: 'POST',
    body: JSON.stringify(objData),
  }))
  if (data.value?.success) {
    value.value = ''
    callHanaMessage({
      type: 'success',
      message: '发布成功',
    })
    emits('published')
  }
  else {
    const errorList = data.value?.payload?.map(item => item.message).join(', ')
    callHanaMessage({
      type: 'error',
      message: errorList || data.value?.statusMessage || '发布失败',
    })
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handlePublish()
  }
}
</script>

<template>
  <div class="w-full">
    <HanaInput v-model="value" type="textarea" resize="none" placeholder="有什么想说的呢~" @keydown="handleKeyDown" />
    <div class="flex items-center justify-end">
      <div class="hana-card my-5 inline-block">
        <HanaButton :disabled="value === ''" shape="square" @click="handlePublish">
          发布 / Enter
        </HanaButton>
      </div>
    </div>
  </div>
</template>
