<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AccountSessionControl from '@/components/AccountSessionControl.vue'
import { NAV_ITEMS } from '@/constants/navigation'

const route = useRoute()
const open = ref(false)

const primary = NAV_ITEMS.filter(item => ['mission-control', 'planning', 'trades', 'review'].includes(item.name))

const shortLabel: Record<string, string> = {
  'mission-control': '總控',
  planning: '規劃',
  trades: '交易',
  review: '復盤',
}

watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
      <button v-if="open" type="button" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" aria-label="關閉導覽" @click="open = false" />
    </Transition>

    <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-full" leave-active-class="transition duration-150" leave-to-class="translate-y-full">
      <section v-if="open" class="hy-mobile-nav-sheet fixed inset-x-3 z-50 max-h-[70vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl lg:hidden">
        <div class="mb-3 flex items-center justify-between px-2">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-400">Freedom OS</p>
            <p class="mt-1 text-sm font-semibold text-zinc-100">全部功能</p>
          </div>
          <button type="button" class="h-9 w-9 rounded-xl border border-zinc-800 text-zinc-500" @click="open = false">×</button>
        </div>
        <nav class="grid grid-cols-2 gap-2">
          <RouterLink
            v-for="item in NAV_ITEMS"
            :key="item.name"
            :to="item.path"
            class="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-medium text-zinc-400 transition"
            active-class="border-amber-500/25 bg-amber-500/10 text-amber-300"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        <AccountSessionControl variant="mobile" />
      </section>
    </Transition>
  </Teleport>

  <nav class="hy-mobile-nav fixed z-50 backdrop-blur-xl lg:hidden" aria-label="手機主要導覽">
    <div class="mx-auto grid max-w-lg grid-cols-5 gap-1">
      <RouterLink
        v-for="item in primary"
        :key="item.name"
        :to="item.path"
        class="rounded-xl px-2 py-2 text-center text-[11px] font-medium text-zinc-500 transition"
        active-class="bg-amber-500/10 text-amber-300"
      >
        {{ shortLabel[item.name] }}
      </RouterLink>
      <button
        type="button"
        class="rounded-xl px-2 py-2 text-center text-[11px] font-medium transition"
        :class="open ? 'bg-sky-500/10 text-sky-300' : 'text-zinc-500'"
        @click="open = !open"
      >
        更多
      </button>
    </div>
  </nav>
</template>
