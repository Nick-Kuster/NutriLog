<script setup>
import { computed, ref } from 'vue'
import { Salad } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const mode = ref('sign-in')
const email = ref('')
const password = ref('')
const localError = ref('')

const title = computed(() => (mode.value === 'sign-in' ? 'Sign in' : 'Create account'))
const submitLabel = computed(() => (mode.value === 'sign-in' ? 'Sign in' : 'Create account'))
const toggleLabel = computed(() => (mode.value === 'sign-in' ? 'Create an account' : 'Use an existing account'))

async function submitEmailAuth() {
  localError.value = ''

  if (!email.value.trim() || password.value.length < 6) {
    localError.value = 'Enter an email and a password with at least 6 characters.'
    return
  }

  try {
    if (mode.value === 'sign-in') {
      await authStore.signInWithEmail(email.value.trim(), password.value)
    } else {
      await authStore.signUpWithEmail(email.value.trim(), password.value)
    }
  } catch {
    // The store exposes the error message for display.
  }
}

function toggleMode() {
  mode.value = mode.value === 'sign-in' ? 'sign-up' : 'sign-in'
  localError.value = ''
  authStore.error = ''
  authStore.message = ''
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-panel" aria-label="NutriLog sign in">
      <header class="auth-header">
        <div class="auth-brand-mark">
          <Salad :size="24" />
        </div>
        <div>
          <p class="eyebrow">NutriLog</p>
          <h1>{{ title }}</h1>
        </div>
      </header>

      <p v-if="authStore.message" class="import-status">{{ authStore.message }}</p>
      <p v-if="localError || authStore.error" class="form-error">{{ localError || authStore.error }}</p>

      <form class="auth-form" novalidate @submit.prevent="submitEmailAuth">
        <label class="form-field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="form-field">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="At least 6 characters"
          />
        </label>

        <button class="primary-action" type="submit" :disabled="authStore.isLoading">
          {{ submitLabel }}
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <button class="secondary-action auth-google-button" type="button" :disabled="authStore.isLoading" @click="authStore.signInWithGoogle">
        Continue with Google
      </button>

      <button class="utility-action auth-mode-button" type="button" @click="toggleMode">
        {{ toggleLabel }}
      </button>
    </section>
  </main>
</template>
