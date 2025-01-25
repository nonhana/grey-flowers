<script setup lang="ts">
withDefaults(defineProps<{
  images?: string[]
}>(), {
  images: () => [],
})

defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div v-if="images.length > 0" class="relative w-full overflow-hidden rounded-xl">
    <!-- Single image -->
    <div v-if="images.length === 1" class="aspect-[16/9]">
      <NuxtImg
        :src="images[0]"
        class="size-full cursor-pointer object-cover"
        loading="lazy"
        @click="$emit('click')"
      />
    </div>

    <!-- Two images -->
    <div v-else-if="images.length === 2" class="grid aspect-[16/9] grid-cols-2 gap-1">
      <NuxtImg
        v-for="(image, index) in images"
        :key="index"
        :src="image"
        class="size-full cursor-pointer object-cover"
        loading="lazy"
        @click="$emit('click')"
      />
    </div>

    <!-- Three images -->
    <div v-else-if="images.length === 3" class="grid aspect-[16/9] grid-cols-2 gap-1">
      <NuxtImg
        :src="images[0]"
        class="row-span-2 size-full cursor-pointer object-cover"
        loading="lazy"
        @click="$emit('click')"
      />
      <NuxtImg
        v-for="(image, index) in images.slice(1)"
        :key="index"
        :src="image"
        class="size-full cursor-pointer object-cover"
        loading="lazy"
        @click="$emit('click')"
      />
    </div>

    <!-- Four images -->
    <div v-else-if="images.length === 4" class="grid aspect-[16/9] grid-cols-2 gap-1">
      <NuxtImg
        v-for="(image, index) in images"
        :key="index"
        :src="image"
        class="size-full cursor-pointer object-cover"
        loading="lazy"
        @click="$emit('click')"
      />
    </div>
  </div>
</template>
