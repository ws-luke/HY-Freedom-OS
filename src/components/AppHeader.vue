<script setup lang="ts">
import { APP_NAME } from '@/config/app'
</script>

<template>
  <header class="flex h-14 shrink-0 items-center border-b border-zinc-800/80 bg-zinc-950/80 px-4 backdrop-blur-sm lg:px-6">
    <h1 class="text-lg font-semibold text-zinc-100">{{ APP_NAME }}</h1>
  </header>
</template>
