<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, Flame, Pencil, Trash2 } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

const props = defineProps({
  mealId: { type: [Number, String], required: true },
})

const router = useRouter()
const mealStore = useMealStore()
const scheduleStore = useScheduleStore()

const meal = computed(() => mealStore.mealById(props.mealId))
const scheduledDate = computed(() => scheduleStore.scheduledMeals.find((schedule) => (
  String(schedule.mealId) === String(props.mealId)
))?.date ?? '')

const isDeleting = ref(false)
const deleteError = ref('')
const isConfirmingDelete = ref(false)

function goBack() {
  router.push({ name: 'meals' })
}

function editMeal() {
  router.push({ name: 'meal-edit', params: { mealId: props.mealId }, query: { date: scheduledDate.value } })
}

async function toggleCompleted(event) {
  await mealStore.setMealCompleted(props.mealId, event.target.checked)
}

function requestDelete() {
  deleteError.value = ''
  isConfirmingDelete.value = true
}

async function confirmDelete() {
  isDeleting.value = true
  deleteError.value = ''

  try {
    await mealStore.deleteMeal(props.mealId)
    isConfirmingDelete.value = false
    goBack()
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Could not delete meal.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <section v-if="!meal" class="content">
    <p class="form-error">Meal not found.</p>
    <button class="secondary-action" type="button" @click="goBack"><ArrowLeft :size="18" /> Back to meals</button>
  </section>

  <section v-else class="content workout-detail">
    <header class="detail-topbar">
      <button class="icon-action" type="button" aria-label="Back to meals" @click="goBack">
        <ArrowLeft :size="20" />
      </button>
      <div>
        <p class="eyebrow">{{ meal.mealType }}{{ scheduledDate ? ` · ${scheduledDate}` : '' }}</p>
        <h1>{{ meal.name }}</h1>
      </div>
    </header>

    <section class="exercise-stats">
      <div>
        <span>{{ meal.servings }}</span>
        <p>Servings</p>
      </div>
      <div>
        <span>{{ meal.prepMinutes }}m</span>
        <p>Prep time</p>
      </div>
      <div>
        <span>{{ meal.calories ?? '—' }}</span>
        <p>Calories</p>
      </div>
      <div>
        <span>{{ meal.proteinG ?? '—' }}g</span>
        <p>Protein</p>
      </div>
    </section>

    <section v-if="meal.carbsG !== undefined || meal.fatG !== undefined" class="exercise-stats">
      <div>
        <span>{{ meal.carbsG ?? '—' }}g</span>
        <p>Carbs</p>
      </div>
      <div>
        <span>{{ meal.fatG ?? '—' }}g</span>
        <p>Fat</p>
      </div>
    </section>

    <section class="form-section">
      <h2>Ingredients</h2>
      <ul class="exercise-list">
        <li v-for="ingredient in meal.ingredients" :key="ingredient.id" class="exercise-list-row">
          <Flame :size="16" />
          <span>{{ ingredient.name }}</span>
          <span>{{ ingredient.quantity }}{{ ingredient.unit ? ` ${ingredient.unit}` : '' }}</span>
        </li>
      </ul>
    </section>

    <section v-if="meal.notes" class="form-section">
      <h2>Notes</h2>
      <p>{{ meal.notes }}</p>
    </section>

    <footer class="modal-footer">
      <label class="secondary-action">
        <input type="checkbox" :checked="meal.status === 'completed'" @change="toggleCompleted" />
        <Check :size="18" /> Eaten
      </label>
      <button class="secondary-action" type="button" @click="editMeal"><Pencil :size="18" /> Edit</button>
      <button class="secondary-action danger-action" type="button" @click="requestDelete"><Trash2 :size="18" /> Delete</button>
    </footer>

    <ConfirmDeleteModal
      v-if="isConfirmingDelete"
      :meal-name="meal.name"
      :is-deleting="isDeleting"
      :error="deleteError"
      @cancel="isConfirmingDelete = false"
      @confirm="confirmDelete"
    />
  </section>
</template>
