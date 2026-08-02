<script setup lang="ts">
import { NAV_ITEMS } from '@/constants/navigation'
</script>

<template>
  <aside class="flex w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
    <nav class="flex flex-1 flex-col gap-1 p-4">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        :to="item.path"
        class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
        active-class="bg-zinc-900 text-zinc-100"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
