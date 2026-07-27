<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AuthScreen from './components/AuthScreen.vue'
import MobileHeader from './components/MobileHeader.vue'
import AddMealScreen from './components/AddMealScreen.vue'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuthStore } from './stores/auth'
import { initializeStores } from './stores/bootstrap'
import { useMealStore } from './stores/meals'
import { useScheduleStore } from './stores/schedule'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const scheduleStore = useScheduleStore()
const mealStore = useMealStore()
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
const editingMeal = computed(() => {
  if (route.name !== 'meal' || !route.query.editMeal) return null

  const meal = mealStore.mealById(route.query.editMeal)
  if (!meal) return null

  const scheduledMeal = scheduleStore.scheduledMeals.find((schedule) => (
    String(schedule.mealId) === String(meal.id)
  ))

  return {
    ...meal,
    date: scheduledMeal?.date ?? '',
  }
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

function handleNavigate() {
  closeMealEditor()
}

function openMeal(meal) {
  router.push({
    name: 'meal',
    params: {
      mealId: meal.id,
    },
  })
}

function closeMeal() {
  router.push({ name: 'meals' })
}

function editMeal(meal) {
  router.push({
    name: route.name,
    params: route.params,
    query: {
      ...route.query,
      editMeal: meal.id,
    },
  })
}

function closeMealEditor() {
  if (!route.query.editMeal) return

  const { editMeal, ...nextQuery } = route.query

  router.replace({
    name: route.name,
    params: route.params,
    query: nextQuery,
  })
}

function routeProps(currentRoute) {
  if (currentRoute.name !== 'meal') return {}

  return {
    mealId: currentRoute.params.mealId,
  }
}

function handleMealSaved({ mealId }) {
  if (route.name === 'meal' && String(route.params.mealId) === String(mealId)) {
    router.replace({
      name: 'meal',
      params: {
        mealId,
      },
    })
  }
}
</script>

<template>
  <AuthScreen v-if="shouldShowAuth" />

  <main v-else class="shell">
    <section v-if="isAppLoading" class="content app-loading" aria-live="polite">
      <p class="eyebrow">NutriLog</p>
      <h1>Loading</h1>
    </section>

    <template v-else>
      <AppSidebar :active-tab="activeTab" @navigate="handleNavigate" />
      <MobileHeader :active-tab="activeTab" @navigate="handleNavigate" />

      <section v-if="storeBootstrapError" class="content">
        <p class="form-error">{{ storeBootstrapError }}</p>
      </section>

      <AddMealScreen
        v-else-if="editingMeal"
        :meal-id="editingMeal.id"
        :scheduled-date="editingMeal.date"
        @saved="handleMealSaved"
        @close="closeMealEditor"
      />
      <RouterView v-else v-slot="{ Component, route: currentRoute }">
        <component
          :is="Component"
          v-bind="routeProps(currentRoute)"
          @open-meal="openMeal"
          @close="closeMeal"
          @edit-meal="editMeal"
        />
      </RouterView>
    </template>
  </main>
</template>
