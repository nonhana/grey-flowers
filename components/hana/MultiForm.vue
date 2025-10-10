<script lang="ts" setup generic="K extends string">
defineProps<{
  keys: readonly K[]
}>()

type KRecord = Partial<Record<K, string>>

const data = defineModel<KRecord[]>()

function addItem() {
  data.value?.push({})
}

function deleteItem(index: number) {
  data.value?.splice(index, 1)
}

function handleInput(e: Event, item: KRecord, key: K) {
  const target = e.target as HTMLInputElement
  item[key] = target.value
}
</script>

<template>
  <div>
    <div v-for="(item, index) in data" :key="index">
      <hana-input
        v-for="key in keys"
        :key="key"
        :placeholder="`请输入${String(key)}的内容`"
        :value="item[key] ?? ''"
        @input="handleInput($event, item, key)"
      >
        <hana-button icon-button icon="lucide:minus" @click="deleteItem(index)" />
      </hana-input>
    </div>
    <hana-button icon-button icon="lucide:plus" @click="addItem()" />
  </div>
</template>
