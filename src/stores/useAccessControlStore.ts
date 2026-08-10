import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getAccessContext } from '@/services/access-control.service'
import type { AccessContext } from '@/types/access-control'

export const useAccessControlStore = defineStore('access-control', () => {
  const context = ref<AccessContext | null>(null)
  const loading = ref(false)
  const loadedForUserId = ref<string | null>(null)

  const isAdmin = computed(() => context.value?.profile.role === 'admin')

  const canUse = (featureKey?: string | null): boolean => {
    if (!featureKey) return true
    if (isAdmin.value) return true
    return context.value?.features[featureKey] === true
  }

  const load = async (force = false): Promise<AccessContext | null> => {
    if (loading.value) return context.value
    if (!force && context.value && loadedForUserId.value === context.value.profile.userId) {
      return context.value
    }

    loading.value = true
    try {
      context.value = await getAccessContext()
      loadedForUserId.value = context.value?.profile.userId ?? null
      return context.value
    }
    finally {
      loading.value = false
    }
  }

  const clear = (): void => {
    context.value = null
    loadedForUserId.value = null
  }

  return { context, loading, isAdmin, canUse, load, clear }
})
