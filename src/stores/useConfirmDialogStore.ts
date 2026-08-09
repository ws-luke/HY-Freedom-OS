import { readonly, ref } from 'vue'
import { defineStore } from 'pinia'

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ConfirmDialogRequest extends Required<ConfirmDialogOptions> {
  id: string
}

export const useConfirmDialogStore = defineStore('confirm-dialog', () => {
  const activeRequest = ref<ConfirmDialogRequest | null>(null)
  let settle: ((confirmed: boolean) => void) | null = null

  const ask = (options: ConfirmDialogOptions): Promise<boolean> => {
    if (settle) settle(false)

    activeRequest.value = {
      id: crypto.randomUUID?.() ?? `confirm-${Date.now()}`,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? '確認',
      cancelLabel: options.cancelLabel ?? '取消',
      tone: options.tone ?? 'default',
    }

    return new Promise(resolve => { settle = resolve })
  }

  const finish = (confirmed: boolean): void => {
    const resolve = settle
    settle = null
    activeRequest.value = null
    resolve?.(confirmed)
  }

  return {
    activeRequest: readonly(activeRequest),
    ask,
    confirm: () => finish(true),
    cancel: () => finish(false),
  }
})
