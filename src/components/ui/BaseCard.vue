<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  title?: string
  description?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  hover: false,
  bordered: true,
})

const slots = useSlots()

const paddingClass = computed(() => {
  switch (props.padding) {
    case 'none':
      return ''

    case 'sm':
      return 'p-4'

    case 'lg':
      return 'p-8'

    default:
      return 'p-6'
  }
})

const cardClass = computed(() => [
  'rounded-3xl bg-zinc-900/80 backdrop-blur-sm transition-all duration-200',
  props.bordered ? 'border border-zinc-800' : '',
  props.hover
    ? 'hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10'
    : '',
])

const hasHeader = computed(() => {
  return (
    !!props.title ||
    !!props.description ||
    !!slots.header
  )
})

const hasFooter = computed(() => !!slots.footer)
</script>

<template>
  <section :class="cardClass">
    <div :class="paddingClass">
      <header
        v-if="hasHeader"
        class="mb-6"
      >
        <slot name="header">
          <div>
            <h2
              v-if="title"
              class="text-xl font-semibold text-zinc-100"
            >
              {{ title }}
            </h2>

            <p
              v-if="description"
              class="mt-1 text-sm leading-6 text-zinc-500"
            >
              {{ description }}
            </p>
          </div>
        </slot>
      </header>

      <div>
        <slot />
      </div>

      <footer
        v-if="hasFooter"
        class="mt-6 border-t border-zinc-800 pt-6"
      >
        <slot name="footer" />
      </footer>
    </div>
  </section>
</template>