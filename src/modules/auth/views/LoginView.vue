<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ThemeToggle from '@/components/ThemeToggle.vue'
import {
  requestPasswordReset,
  signInWithPassword,
  updateCloudPassword,
} from '@/services/cloud/cloud-auth.service'

type AuthMode = 'login' | 'forgot' | 'reset'

const route = useRoute()
const router = useRouter()
const mode = ref<AuthMode>(route.query.mode === 'reset' ? 'reset' : 'login')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ email: '', password: '', passwordConfirm: '' })

const isValid = computed(() => {
  if (mode.value === 'forgot') return form.email.trim().includes('@')
  if (mode.value === 'reset') {
    return form.password.length >= 8 && form.password === form.passwordConfirm
  }
  return form.email.trim().includes('@') && form.password.length >= 8
})

const destination = computed(() => {
  const value = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  return value.startsWith('/') && !value.startsWith('//') && value !== '/login' ? value : '/'
})

const changeMode = (nextMode: AuthMode): void => {
  mode.value = nextMode
  form.password = ''
  form.passwordConfirm = ''
  errorMessage.value = ''
  successMessage.value = ''
}

watch(() => route.query.mode, value => {
  if (value === 'reset') changeMode('reset')
})

const submit = async (): Promise<void> => {
  if (!isValid.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (mode.value === 'forgot') {
      try {
        await requestPasswordReset(form.email.trim())
      }
      catch {
        // Deliberately return the same response so the page cannot be used to
        // discover which email addresses are registered.
      }
      successMessage.value = '若此 Email 已建立 Freedom Account，系統將寄出密碼重設信。請檢查收件匣與垃圾郵件。'
      return
    }

    if (mode.value === 'reset') {
      await updateCloudPassword(form.password)
      form.password = ''
      form.passwordConfirm = ''
      successMessage.value = '密碼已更新，正在返回 Freedom OS。'
      window.setTimeout(() => void router.replace('/'), 800)
      return
    }

    const session = await signInWithPassword(form.email.trim(), form.password)
    if (!session) throw new Error('尚未取得登入權限，請確認 Email 與密碼。')
    await router.replace(destination.value)
  }
  catch (error) {
    errorMessage.value = mode.value === 'reset'
      ? '重設連結可能已失效，請返回登入頁重新申請。'
      : error instanceof Error ? error.message : 'Freedom Account 登入失敗。'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
    <div class="pointer-events-none absolute inset-0 opacity-80">
      <div class="absolute left-[12%] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-violet-600/10 blur-[110px]" />
      <div class="absolute bottom-[-14rem] right-[8%] h-[32rem] w-[32rem] rounded-full bg-sky-500/10 blur-[110px]" />
    </div>

    <div class="absolute right-5 top-5 z-10"><ThemeToggle /></div>

    <div class="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_440px] lg:px-10">
      <section class="hidden lg:block">
        <div class="flex items-center gap-4">
          <img src="/pwa-192.png" alt="Freedom OS" class="h-16 w-16 rounded-2xl shadow-2xl shadow-sky-500/10" />
          <div>
            <p class="text-xs font-semibold tracking-[0.26em] text-sky-300">HY FREEDOM OS</p>
            <h1 class="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">Your Trading Operating System.</h1>
          </div>
        </div>
        <p class="mt-8 max-w-xl text-base leading-8 text-zinc-500">交易帳戶、MT5 紀錄、交易計畫、復盤、策略與 Analytics，都回到同一個 Freedom Account。</p>
        <div class="mt-10 grid max-w-xl grid-cols-3 gap-3">
          <div v-for="item in [['CLOUD', 'Supabase'], ['DATA', 'RLS Protected'], ['ACCESS', 'Private']]" :key="item[0]" class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
            <p class="text-[10px] font-semibold tracking-[0.16em] text-zinc-600">{{ item[0] }}</p>
            <p class="mt-2 text-sm font-medium text-zinc-300">{{ item[1] }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-[28px] border border-white/[0.07] bg-zinc-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
        <div class="lg:hidden"><img src="/pwa-192.png" alt="Freedom OS" class="h-12 w-12 rounded-xl" /></div>
        <p class="mt-5 text-[11px] font-semibold tracking-[0.2em] text-violet-400 lg:mt-0">FREEDOM ACCOUNT</p>
        <h2 class="mt-2 text-2xl font-semibold text-zinc-100">
          {{ mode === 'forgot' ? '找回登入密碼' : mode === 'reset' ? '設定新密碼' : '登入 Freedom OS' }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-zinc-500">
          {{ mode === 'login' ? '私人交易工作區，目前不開放公開註冊。' : mode === 'forgot' ? '輸入登入 Email，我們會寄送安全重設連結。' : '請建立至少 8 個字元的新密碼。' }}
        </p>

        <form class="mt-6" @submit.prevent="submit">
          <label v-if="mode !== 'reset'" class="block">
            <span class="text-xs font-medium text-zinc-400">Email</span>
            <input v-model.trim="form.email" type="email" autocomplete="email" required class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-sky-400/40" placeholder="you@example.com" />
          </label>

          <label v-if="mode !== 'forgot'" :class="mode === 'login' ? 'mt-4 block' : 'block'">
            <span class="text-xs font-medium text-zinc-400">{{ mode === 'reset' ? '新密碼' : '密碼' }}</span>
            <input v-model="form.password" type="password" :autocomplete="mode === 'reset' ? 'new-password' : 'current-password'" minlength="8" required class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-sky-400/40" placeholder="至少 8 個字元" />
          </label>

          <label v-if="mode === 'reset'" class="mt-4 block">
            <span class="text-xs font-medium text-zinc-400">確認新密碼</span>
            <input v-model="form.passwordConfirm" type="password" autocomplete="new-password" minlength="8" required class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-sky-400/40" placeholder="再次輸入新密碼" />
          </label>

          <p v-if="mode === 'reset' && form.passwordConfirm && form.password !== form.passwordConfirm" class="mt-2 text-xs text-rose-300">兩次輸入的密碼不一致。</p>

          <button type="submit" :disabled="!isValid || loading" class="mt-5 w-full rounded-xl bg-sky-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600">
            {{ loading ? '處理中…' : mode === 'forgot' ? '寄送重設連結' : mode === 'reset' ? '更新密碼' : '登入 Freedom OS' }}
          </button>
        </form>

        <button v-if="mode === 'login'" type="button" class="mt-4 w-full text-center text-xs text-zinc-500 transition hover:text-sky-300" @click="changeMode('forgot')">忘記密碼？</button>
        <button v-else-if="mode === 'forgot'" type="button" class="mt-4 w-full text-center text-xs text-zinc-500 transition hover:text-sky-300" @click="changeMode('login')">返回登入</button>

        <div v-if="errorMessage || successMessage" class="mt-4 rounded-xl border px-4 py-3 text-xs leading-5" :class="errorMessage ? 'border-rose-400/15 bg-rose-400/[0.04] text-rose-300' : 'border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300'">{{ errorMessage || successMessage }}</div>
        <p class="mt-6 text-center text-[11px] text-zinc-700">Freedom OS · Private trading workspace</p>
      </section>
    </div>
  </main>
</template>
