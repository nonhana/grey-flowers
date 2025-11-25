<template>
  <ClientOnly>
    <slot />

    <template #fallback>
      <slot />
    </template>
  </ClientOnly>
</template>
