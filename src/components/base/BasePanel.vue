<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padding?: boolean
    hover?: boolean
  }>(),
  {
    padding: true,
    hover: false,
  },
)

const slots = useSlots()

const hasHeader = computed(
  () => Boolean(slots.header || props.title || props.subtitle),
)
</script>

<template>
  <section
    class="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm shadow-black/20"
    :class="[
      padding ? 'p-6 lg:p-8' : '',
      hover
        ? 'transition-colors duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/80'
        : '',
    ]"
  >
    <div
      v-if="hasHeader"
      :class="{ 'mb-4': slots.default || slots.footer }"
    >
      <slot name="header">
        <div>
          <h2
            v-if="title"
            class="text-xs font-medium tracking-wider text-zinc-400 uppercase"
          >
            {{ title }}
          </h2>
          <p
            v-if="subtitle"
            class="mt-1 text-sm text-zinc-500"
          >
            {{ subtitle }}
          </p>
        </div>
      </slot>
    </div>

    <div
      v-if="slots.default"
      class="text-sm leading-relaxed text-zinc-500"
    >
      <slot />
    </div>

    <div
      v-if="slots.footer"
      class="mt-4 border-t border-zinc-800/80 pt-4"
    >
      <slot name="footer" />
    </div>
  </section>
</template>
