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
      <HanaLazyImg
        :src="images[0]!"
        alt="动态配图"
        width="100%"
        height="100%"
        surface-class=""
        img-class="block size-full cursor-pointer object-cover"
        @click="$emit('click')"
      />
    </div>

    <!-- Two images -->
    <div v-else-if="images.length === 2" class="grid grid-cols-2 aspect-[16/9] gap-1">
      <HanaLazyImg
        v-for="(image, index) in images"
        :key="index"
        :src="image"
        alt="动态配图"
        width="100%"
        height="100%"
        surface-class=""
        img-class="block size-full cursor-pointer object-cover"
        @click="$emit('click')"
      />
    </div>

    <!-- Three images -->
    <div v-else-if="images.length === 3" class="grid grid-cols-2 aspect-[16/9] gap-1">
      <HanaLazyImg
        class="row-span-2"
        :src="images[0]!"
        alt="动态配图"
        width="100%"
        height="100%"
        surface-class=""
        img-class="block size-full cursor-pointer object-cover"
        @click="$emit('click')"
      />
      <HanaLazyImg
        v-for="(image, index) in images.slice(1)"
        :key="index"
        :src="image"
        alt="动态配图"
        width="100%"
        height="100%"
        surface-class=""
        img-class="block size-full cursor-pointer object-cover"
        @click="$emit('click')"
      />
    </div>

    <!-- Four images -->
    <div v-else-if="images.length === 4" class="grid grid-cols-2 aspect-[16/9] gap-1">
      <HanaLazyImg
        v-for="(image, index) in images"
        :key="index"
        :src="image"
        alt="动态配图"
        width="100%"
        height="100%"
        surface-class=""
        img-class="block size-full cursor-pointer object-cover"
        @click="$emit('click')"
      />
    </div>
  </div>
</template>
