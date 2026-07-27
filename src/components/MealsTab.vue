<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import { useUserPreferencesStore } from '../stores/userPreferences'
import AddMealScreen from './AddMealScreen.vue'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

const scheduleStore = useScheduleStore()
const mealStore = useMealStore()
const userPreferencesStore = useUserPreferencesStore()
const route = useRoute()
const router = useRouter()

const allScheduledMeals = computed(() => scheduleStore.scheduledMeals
  .map((schedule) => {
    const meal = mealStore.mealById(schedule.mealId)
    return meal ? { ...meal, date: schedule.date } : null
  })
  .filter(Boolean))

function toLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${month}-${day}-${year}`
}

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

function startOfPlanWeek(date) {
  const daysSinceWeekStart = (date.getDay() - userPreferencesStore.weekStartsOn + 7) % 7
  return addDays(date, -daysSinceWeekStart)
}

function initialWeekAnchor() {
  return new Date()
}

function dayOfWeek(isoDate) {
  return toLocalDate(isoDate).toLocaleDateString('en-US', { weekday: 'long' })
}

function formatWeekRange(start, end) {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

const selectedWeekStart = ref(startOfPlanWeek(initialWeekAnchor()))
const mealPendingDelete = ref(null)
const isDeletingMeal = ref(false)
const deleteMealError = ref('')

const selectedWeekEnd = computed(() => addDays(selectedWeekStart.value, 6))

const weekDateRange = computed(() => formatWeekRange(selectedWeekStart.value, selectedWeekEnd.value))

const scheduledMeals = computed(() => {
  const startIsoDate = toIsoDate(selectedWeekStart.value)
  const endIsoDate = toIsoDate(selectedWeekEnd.value)

  return allScheduledMeals.value.filter((meal) => meal.date >= startIsoDate && meal.date <= endIsoDate)
})
const isAddMealOpen = computed(() => route.query.addMeal === '1')
const editingMeal = computed(() => {
  const editMealId = route.query.editMeal
  if (!editMealId) return null

  return allScheduledMeals.value.find((meal) => String(meal.id) === String(editMealId)) ?? null
})
const isMealEditorOpen = computed(() => isAddMealOpen.value || editingMeal.value)
const mealEditorKey = computed(() => (
  editingMeal.value ? `edit-${editingMeal.value.id}` : 'add'
))

function moveWeek(days) {
  selectedWeekStart.value = addDays(selectedWeekStart.value, days)
}

function openAddMeal() {
  router.push({ name: 'meals', query: { addMeal: '1' } })
}

function openEditMeal(meal) {
  router.push({ name: 'meals', query: { editMeal: meal.id } })
}

function requestDeleteMeal(meal) {
  deleteMealError.value = ''
  mealPendingDelete.value = meal
}

function cancelDeleteMeal() {
  if (isDeletingMeal.value) return
  deleteMealError.value = ''
  mealPendingDelete.value = null
}

async function confirmDeleteMeal() {
  if (!mealPendingDelete.value || isDeletingMeal.value) return

  const mealId = mealPendingDelete.value.id
  isDeletingMeal.value = true
  deleteMealError.value = ''

  try {
    await mealStore.deleteMeal(mealId)
    mealPendingDelete.value = null
  } catch (error) {
    deleteMealError.value = error instanceof Error ? error.message : 'Could not delete meal.'
  } finally {
    isDeletingMeal.value = false
  }
}

function closeMealEditor() {
  router.push({ name: 'meals' })
}

function handleMealSaved({ date }) {
  selectedWeekStart.value = startOfPlanWeek(toLocalDate(date))
}
</script>

<template>
  <AddMealScreen
    v-if="isMealEditorOpen"
    :key="mealEditorKey"
    :meal-id="editingMeal?.id"
    :scheduled-date="editingMeal?.date || toIsoDate(selectedWeekStart)"
    @saved="handleMealSaved"
    @close="closeMealEditor"
  />

  <ConfirmDeleteModal
    v-if="mealPendingDelete"
    :meal-name="mealPendingDelete.name"
    :is-deleting="isDeletingMeal"
    :error="deleteMealError"
    @cancel="cancelDeleteMeal"
    @confirm="confirmDeleteMeal"
  />

  <section class="content">
    <header class="topbar">
      <div class="week-title-row">
        <button class="icon-action week-nav-button" type="button" aria-label="Previous week" @click="moveWeek(-7)">
          <ChevronLeft :size="22" />
        </button>
        <div>
          <p class="eyebrow">Meal week</p>
          <h1>{{ weekDateRange }}</h1>
        </div>
        <button class="icon-action week-nav-button" type="button" aria-label="Next week" @click="moveWeek(7)">
          <ChevronRight :size="22" />
        </button>
      </div>
      <button class="primary-action" type="button" @click="openAddMeal"><Plus :size="18" /> Add Meal</button>
    </header>

    <section class="workouts" aria-label="Upcoming meals">
      <p v-if="!scheduledMeals.length" class="empty-week">No meals scheduled for this week.</p>
      <article
        v-for="meal in scheduledMeals"
        :key="`${meal.date}-${meal.id}`"
        class="workout-row"
        :class="{ completed: meal.status === 'completed' }"
      >
        <label class="check">
          <input
            :checked="meal.status === 'completed'"
            type="checkbox"
            @change="mealStore.setMealCompleted(meal.id, $event.target.checked)"
          />
          <span aria-hidden="true"></span>
        </label>
        <p class="workout-date-line">
          <strong>{{ dayOfWeek(meal.date) }}</strong>
          <span>{{ formatDate(meal.date) }}</span>
        </p>
        <RouterLink
          class="workout-main workout-link"
          :to="{ name: 'meal', params: { mealId: meal.id } }"
        >
          <h2>{{ meal.name }}</h2>
          <p>{{ meal.mealType }}</p>
        </RouterLink>
        <div class="workout-meta">
          <strong>{{ meal.servings }}x</strong>
          <span>{{ meal.calories ? `${meal.calories} cal` : meal.mealType }}</span>
          <button class="icon-action workout-edit-button" type="button" :aria-label="`Edit ${meal.name}`" @click="openEditMeal(meal)">
            <Pencil :size="16" />
          </button>
          <button class="icon-action workout-delete-button danger-icon-button" type="button" :aria-label="`Delete ${meal.name}`" @click.stop="requestDeleteMeal(meal)">
            <Trash2 :size="16" />
          </button>
        </div>
      </article>
    </section>
  </section>
</template>
