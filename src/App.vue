<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AuthScreen from './components/AuthScreen.vue'
import MobileHeader from './components/MobileHeader.vue'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuthStore } from './stores/auth'
import { initializeStores } from './stores/bootstrap'

const route = useRoute()
const authStore = useAuthStore()
const isStoreBootstrapLoading = ref(false)
const storeBootstrapError = ref('')

const shouldShowAuth = computed(() => isSupabaseConfigured && authStore.initialized && !authStore.isAuthenticated)
const isAppLoading = computed(() => isSupabaseConfigured && (!authStore.initialized || isStoreBootstrapLoading.value))

const activeTab = computed(() => {
  if (route.name === 'schedule' || route.name === 'grocery' || route.name === 'tools' || route.name === 'settings') {
    return route.name
  }

  return 'meals'
})

onMounted(async () => {
  await authStore.initializeAuth()
})

watch(() => authStore.user?.id, async (userId) => {
  if (!isSupabaseConfigured || !userId) return

  isStoreBootstrapLoading.value = true
  storeBootstrapError.value = ''

  try {
    await initializeStores()
  } catch (error) {
    storeBootstrapError.value = error instanceof Error ? error.message : 'Unable to load your meal data.'
  } finally {
    isStoreBootstrapLoading.value = false
  }
}, { immediate: true })
</script>

<template>
  <AuthScreen v-if="shouldShowAuth" />

  <main v-else class="shell">
    <section v-if="isAppLoading" class="content app-loading" aria-live="polite">
      <p class="eyebrow">NutriLog</p>
      <h1>Loading</h1>
    </section>

    <template v-else>
      <AppSidebar :active-tab="activeTab" />
      <MobileHeader :active-tab="activeTab" />

      <section v-if="storeBootstrapError" class="content">
        <p class="form-error">{{ storeBootstrapError }}</p>
      </section>

      <RouterView v-else />
    </template>
  </main>
</template>
