<script setup lang="ts">
function handleClick() {
  console.log('click')
}
</script>

<template>
  <div class="flex h-[50px] w-full justify-center bg-[#fff8] shadow-md backdrop-blur">
    <div class="relative flex h-full w-[92%] max-w-[1200px] items-center justify-between">
      <HanaButton
        type="icon"
        icon="lucide:align-justify"
        class="md:hidden"
        @click="handleClick"
      />

      <HanaLogo class="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0" />

      <div class="absolute left-1/2 hidden -translate-x-1/2 gap-0 transition-all md:flex lg:gap-4">
        <HanaButton icon="lucide:house" text="主页" @click="handleClick" />
        <HanaButton icon="lucide:notebook-pen" text="文章" @click="handleClick" />
        <HanaButton icon="lucide:messages-square" text="碎碎念" @click="handleClick" />
        <HanaButton icon="lucide:info" text="关于" @click="handleClick" />
        <HanaButton icon="lucide:link" text="友链" @click="handleClick" />
      </div>

      <HanaButton
        type="icon"
        icon="lucide:user-round"
        class="ml-auto"
        @click="handleClick"
      />
    </div>
  </div>
</template>
