<script lang="ts" setup generic="K extends { key: string, type: 'text' | 'number' }">
// TODO: 仅支持 type: 'text' | 'number' 类型的 input，待扩展
const props = defineProps<{
  keyConfig: readonly K[]
}>()

type KRecord = Partial<{
  [Key in K['key']]:
  Extract<K, { key: Key }>['type'] extends 'text' ? string
    : Extract<K, { key: Key }>['type'] extends 'number' ? number
      : never
}>

const data = defineModel<KRecord[]>()

function addItem() {
  data.value?.push({})
}

function deleteItem(index: number) {
  data.value?.splice(index, 1)
}

function handleInput(e: Event, item: KRecord, key: K['key']) {
  const target = e.target as HTMLInputElement
  const targetKeyItem = props.keyConfig.find(item => item.key === key)!

  if (targetKeyItem.type === 'number')
    item[key] = Number.parseInt(target.value) as KRecord[typeof key]
  else
    item[key] = target.value as KRecord[typeof key]
}
</script>

<template>
  <div class="flex flex-col items-center border-2 border-hana-blue rounded-lg p-2">
    <div
      v-for="(item, index) in data"
      :key="index"
      :class="index === (data?.length ?? 0) - 1 ? 'border-b-0!' : ''"
      class="w-full flex items-center border-b-2 border-hana-blue py-2"
    >
      <div class="grid grid-cols-3 flex-1">
        <hana-input
          v-for="key in keyConfig"
          :key="key.key"
          :type="key.type"
          :placeholder="`请输入${String(key.key)}的内容`"
          :value="item[key] ?? ''"
          @input="handleInput($event, item, key.key)"
        />
      </div>
      <hana-button dark-mode class="shrink-0" icon-button icon="lucide:minus" @click="deleteItem(index)" />
    </div>
    <hana-button icon="lucide:plus" @click="addItem()">
      添加一首歌
    </hana-button>
  </div>
</template>
