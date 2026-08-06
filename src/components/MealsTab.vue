<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import { useUserPreferencesStore } from '../stores/userPreferences'
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

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayIsoDate() {
  return toIsoDate(new Date())
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
  const dateParam = route.query.date
  return typeof dateParam === 'string' && dateParam ? toLocalDate(dateParam) : new Date()
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
const dayLanesEl = ref(null)

const selectedWeekEnd = computed(() => addDays(selectedWeekStart.value, 6))

const weekDateRange = computed(() => formatWeekRange(selectedWeekStart.value, selectedWeekEnd.value))

const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = addDays(selectedWeekStart.value, index)
  const isoDate = toIsoDate(date)

  return {
    isoDate,
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: date.getDate(),
    isToday: isoDate === todayIsoDate(),
    meals: allScheduledMeals.value
      .filter((meal) => meal.date === isoDate)
      .sort((first, second) => first.name.localeCompare(second.name)),
  }
}))

function moveWeek(days) {
  selectedWeekStart.value = addDays(selectedWeekStart.value, days)
}

// On mobile, .day-lanes is a horizontally swipeable strip (one day at a
// time, see @media (max-width: 760px) in style.css) — the week itself
// already starts on the correct current week, but the scroll position
// still defaults to the first lane in that grid/flex order rather than
// today's. On desktop this is a no-op (all 7 lanes fit in the grid, so
// there's nothing to scroll).
async function scrollToToday() {
  await nextTick()
  dayLanesEl.value?.querySelector('[data-iso-date="' + todayIsoDate() + '"]')
    ?.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
}

onMounted(scrollToToday)

function openAddMeal() {
  router.push({ name: 'meal-new', query: { date: toIsoDate(selectedWeekStart.value) } })
}

function openEditMeal(meal) {
  router.push({ name: 'meal-edit', params: { mealId: meal.id }, query: { date: meal.date } })
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
</script>

<template>
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
      <div class="meals-toolbar">
        <RouterLink class="secondary-action" :to="{ name: 'grocery', query: { week: toIsoDate(selectedWeekStart) } }">
          <ShoppingCart :size="18" /> Grocery List
        </RouterLink>
        <button class="primary-action" type="button" @click="openAddMeal"><Plus :size="18" /> Add Meal</button>
      </div>
    </header>

    <section ref="dayLanesEl" class="day-lanes" aria-label="Meals for the week">
      <article
        v-for="day in weekDays"
        :key="day.isoDate"
        class="day-lane"
        :class="{ today: day.isToday }"
        :data-iso-date="day.isoDate"
      >
        <header class="day-lane-header">
          <span>{{ day.weekday }}</span>
          <strong>{{ day.dayNumber }}</strong>
        </header>

        <div class="day-lane-meals">
          <article
            v-for="meal in day.meals"
            :key="`${meal.date}-${meal.id}`"
            class="day-lane-meal-card"
            :class="{ completed: meal.status === 'completed' }"
          >
            <div class="day-lane-meal-top">
              <label class="check">
                <input
                  :checked="meal.status === 'completed'"
                  type="checkbox"
                  @change="mealStore.setMealCompleted(meal.id, $event.target.checked)"
                />
                <span aria-hidden="true"></span>
              </label>
              <RouterLink class="day-lane-meal-link" :to="{ name: 'meal', params: { mealId: meal.id } }">
                <strong>{{ meal.name }}</strong>
                <span>{{ meal.mealType }}</span>
              </RouterLink>
            </div>
            <div class="day-lane-meal-actions">
              <button class="icon-action day-lane-icon-button" type="button" :aria-label="`Edit ${meal.name}`" @click="openEditMeal(meal)">
                <Pencil :size="14" />
              </button>
              <button class="icon-action day-lane-icon-button danger-icon-button" type="button" :aria-label="`Delete ${meal.name}`" @click.stop="requestDeleteMeal(meal)">
                <Trash2 :size="14" />
              </button>
            </div>
          </article>

          <p v-if="!day.meals.length" class="day-lane-empty">No meals</p>
        </div>
      </article>
    </section>

    <ConfirmDeleteModal
      v-if="mealPendingDelete"
      :meal-name="mealPendingDelete.name"
      :is-deleting="isDeletingMeal"
      :error="deleteMealError"
      @cancel="cancelDeleteMeal"
      @confirm="confirmDeleteMeal"
    />
  </section>
</template>
