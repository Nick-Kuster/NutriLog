<script setup>
import { computed, ref } from 'vue'
import { Clipboard, Download, FileJson, LoaderCircle, Upload, X } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import { useGroceryStore } from '../stores/grocery'
import { useUserPreferencesStore } from '../stores/userPreferences'
import { importedOwnedGroceries } from '../lib/ownedGroceries'

const scheduleStore = useScheduleStore()
const mealStore = useMealStore()
const groceryStore = useGroceryStore()
const preferencesStore = useUserPreferencesStore()

const importFileInput = ref(null)
const importMessage = ref('')
const isImporting = ref(false)
const pastedImportData = ref('')
const isPasteImportModalOpen = ref(false)
const exportRangeMode = ref('current-month')
const exportStartDate = ref(startOfMonthIsoDate(new Date()))
const exportEndDate = ref(endOfMonthIsoDate(new Date()))

const exportData = computed(() => ({
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  exportRange: {
    mode: exportRangeMode.value,
    startDate: resolvedExportRange.value.startDate,
    endDate: resolvedExportRange.value.endDate,
  },
  meals: JSON.parse(JSON.stringify(filteredExportMeals.value)),
  schedule: JSON.parse(JSON.stringify(filteredExportSchedule.value)),
}))
const exportJson = computed(() => formatJson(exportData.value))
const templateJson = computed(() => formatJson(buildWeekTemplate()))
const resolvedExportRange = computed(() => {
  if (exportRangeMode.value === 'custom') {
    const [startDate, endDate] = [exportStartDate.value, exportEndDate.value].sort()

    return {
      startDate,
      endDate,
    }
  }

  const today = new Date()
  return {
    startDate: startOfMonthIsoDate(today),
    endDate: endOfMonthIsoDate(today),
  }
})
const filteredExportSchedule = computed(() => {
  const { startDate, endDate } = resolvedExportRange.value

  return scheduleStore.schedule.filter((schedule) => schedule.date >= startDate && schedule.date <= endDate)
})
const filteredExportMeals = computed(() => {
  const mealIds = new Set(filteredExportSchedule.value
    .map((schedule) => schedule.mealId)
    .filter((mealId) => mealId !== null && mealId !== undefined)
    .map((mealId) => String(mealId)))

  return mealStore.meals.filter((meal) => mealIds.has(String(meal.id)))
})

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonthIsoDate(date) {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

function endOfMonthIsoDate(date) {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

function formatJson(data) {
  return JSON.stringify(data, null, 2)
}

function getTemplate() {
  downloadJson(buildWeekTemplate(), 'nutrilog-week-template.json')
}

function exportMeals() {
  const { startDate, endDate } = resolvedExportRange.value
  downloadJson(exportData.value, `nutrilog-export-${startDate}-to-${endDate}.json`)
}

async function copyJson(jsonText, label) {
  try {
    await navigator.clipboard.writeText(jsonText)
    importMessage.value = `Copied ${label}`
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = jsonText
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    importMessage.value = `Copied ${label}`
  }
}

function triggerImport() {
  if (isImporting.value) return
  importFileInput.value?.click()
}

function importMealsFromFile(event) {
  const [file] = event.target.files ?? []
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    try {
      await runImport(JSON.parse(reader.result), 'Imported meals')
    } catch (error) {
      importMessage.value = error instanceof Error ? error.message : 'Import failed'
    } finally {
      event.target.value = ''
    }
  }
  reader.readAsText(file)
}

async function importPastedMeals() {
  try {
    await runImport(JSON.parse(pastedImportData.value), 'Imported pasted data')
    pastedImportData.value = ''
    closePasteImportModal()
  } catch (error) {
    importMessage.value = error instanceof Error ? error.message : 'Import failed'
  }
}

function openPasteImportModal() {
  if (isImporting.value) return
  pastedImportData.value = ''
  isPasteImportModalOpen.value = true
}

function closePasteImportModal() {
  if (isImporting.value) return
  isPasteImportModalOpen.value = false
}

async function runImport(data, successMessage) {
  isImporting.value = true
  importMessage.value = 'Importing meals...'

  try {
    await importMealData(data)
    importMessage.value = successMessage
  } finally {
    isImporting.value = false
  }
}

async function importMealData(data) {
  validateImportData(data)
  const ownedItems = importedOwnedGroceries(data, preferencesStore.weekStartsOn)

  const returnedMealIdMap = await mealStore.importMeals(data.meals)
  const importedMealIdMap = hasMealIdMappings(returnedMealIdMap)
    ? returnedMealIdMap
    : hasMealIdMappings(mealStore.importedMealIdMap)
      ? mealStore.importedMealIdMap
      : buildImportedMealIdMap(data.meals, mealStore.meals.slice(-data.meals.length))

  for (const item of data.schedule) {
    if (item.mealId === null || item.mealId === undefined) continue

    const mappedMealId = importedMealIdMap[String(item.mealId)]
    if (!mappedMealId) {
      throw new Error('Could not map imported meal ' + item.mealId + ' to a saved meal')
    }

    await scheduleStore.scheduleMeal(item.date, mappedMealId, item.isCompleted === true)
  }
  try {
    await groceryStore.applyImportedOwnership(ownedItems)
  } catch (error) {
    throw new Error('Meals and schedule were imported, but pantry checkoffs could not be saved. Check off owned groceries manually. ' + error.message)
  }
}

function hasMealIdMappings(mealIdMap) {
  return mealIdMap && Object.keys(mealIdMap).length > 0
}

function buildImportedMealIdMap(importedMeals, savedMeals) {
  return Object.fromEntries(importedMeals.map((meal, index) => [
    String(meal.id),
    savedMeals[index]?.id ?? meal.id,
  ]))
}

function validateImportData(data) {
  if (!data || !Array.isArray(data.meals) || !Array.isArray(data.schedule)) {
    throw new Error('Import file must include meals and schedule arrays')
  }

  const mealIds = new Set(data.meals.map((meal) => String(meal.id)))
  const missingMealId = data.schedule
    .filter((item) => item.mealId !== null && item.mealId !== undefined)
    .find((item) => !mealIds.has(String(item.mealId)))?.mealId

  if (missingMealId !== undefined) {
    throw new Error(`Schedule references meal ${missingMealId}, but that meal is not in the import file`)
  }
}

function buildWeekTemplate() {
  const startDate = new Date()
  const schedule = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return { date: date.toISOString().slice(0, 10), mealId: index === 0 ? 1001 : null }
  })
  schedule.push({ date: schedule[0].date, mealId: 1002 })

  return {
    schemaVersion: 1,
    llmInstructions: {
      completion: 'Completion belongs to each schedule entry: use isCompleted: false for new plans, or true only for that specific date when confirmed eaten. Repeated meals share a mealId but have independent isCompleted values. The legacy meal.status field does not mark scheduled meals eaten.',
      alreadyOwned: 'Each ingredient may include alreadyOwned: true or false (a JSON boolean, never a string). Set true only when the user confirms they have enough for ALL uses of that ingredient in that shopping week. Photos can identify items, but do not assume hidden quantities; ask if needed and use false when uncertain or only partly stocked. Use consistent names and units and the same ownership flag for the ingredient across meals in that week. Keep full recipe quantities unchanged. All occurrences must be true for the combined grocery item to be checked off. These hints apply only to weeks in this import, not future reuse of a recipe. Omit the field or use false for items that need buying. NutriLog preserves existing manual grocery checkoffs.',
      general: 'Generate a realistic weekly meal plan tailored to the goals, dietary preferences, calorie/macro targets, and household size the user describes. The example meals and schedule below exist only to demonstrate the required JSON shape - replace them entirely with plan-appropriate content rather than reusing their names or ingredients.',
      mealStructure: 'A meal has: id (unique number), name, mealType ("Breakfast", "Lunch", "Dinner", "Snack", or "Meal"), servings (integer), prepMinutes, status ("planned" or "completed"), notes, optional per-serving nutrition (calories, proteinG, carbsG, fatG), an ordered ingredients array, and an ordered instructions array.',
      ingredientFields: 'Each ingredient needs a unique id, a name, a quantity (number), a unit (free text, e.g. "cup", "g", "oz", "clove" - use "" if the ingredient does not need one, like "2 eggs"), and a category used to group the grocery list. category must be one of: Produce, Protein, Dairy & Eggs, Grains & Bread, Pantry, Frozen, Condiments & Spices, Other.',
      instructionFields: 'instructions is an array of sections, each with a heading (string, use "" if the recipe does not need named sections) and a steps array of strings. Every step must be a real, actionable cooking instruction (specific temperatures, times, techniques) - never a placeholder like "cook until done". Simple meals can use a single section with heading "" and a short steps list; multi-stage recipes (e.g. a sauce plus a main) should use one section per stage with a short heading like "Marinade" or "Sauce" so the steps stay grouped. Every meal should have at least one instructions section unless it is truly assembly-only (e.g. a pre-made snack) - the notes field is for general remarks, not for the actual steps.',
      walmartProducts: 'For each ingredient, optionally include walmartUrl (string). Browse Walmart.com and verify the actual product matches the ingredient, including its variant and package size. Use the full https://www.walmart.com/ip/... product URL containing its numeric item ID. Never invent URLs or IDs or use search-result URLs. If browsing is unavailable or a match cannot be verified, use walmartUrl: "". Reuse the same verified product URL for the same ingredient across meals. Keep recipe quantity and unit unchanged: these are ingredient amounts, not Walmart package counts. The shopper reviews package counts before adding products to Walmart. Do not claim local stock or prices without checking them.',
      scheduleRules: 'schedule is an array covering every day of the plan, one entry per date (YYYY-MM-DD, chronological, no gaps), each with a mealId. A single day can have multiple schedule entries (e.g. breakfast, lunch, dinner) - repeat the date with a different mealId for each. Use mealId: null only for days intentionally left open. Every non-null mealId must match an id in the meals array, and every meal id should be referenced by at least one schedule entry.',
      outputFormat: 'Return only the raw JSON object described by this shape - no markdown code fences, no leading or trailing commentary, and no comments inside the JSON. The response must be valid JSON that can be parsed directly by JSON.parse.',
    },
    meals: [
      {
        id: 1001,
        name: 'Example Greek Yogurt Bowl',
        mealType: 'Breakfast',
        servings: 1,
        prepMinutes: 5,
        calories: 320,
        proteinG: 24,
        carbsG: 38,
        fatG: 8,
        status: 'planned',
        notes: '',
        ingredients: [
          { id: 'greek-yogurt', name: 'Greek yogurt', quantity: 1, unit: 'cup', category: 'Dairy & Eggs', alreadyOwned: false },
          { id: 'blueberries', name: 'Blueberries', quantity: 0.5, unit: 'cup', category: 'Produce' },
          { id: 'granola', name: 'Granola', quantity: 0.25, unit: 'cup', category: 'Pantry' },
        ],
        instructions: [
          {
            heading: '',
            steps: [
              'Spoon the Greek yogurt into a bowl.',
              'Top with blueberries and granola.',
              'Serve immediately so the granola stays crisp.',
            ],
          },
        ],
      },
      {
        id: 1002,
        name: 'Example Chicken Stir Fry',
        mealType: 'Dinner',
        servings: 4,
        prepMinutes: 30,
        calories: 480,
        proteinG: 38,
        carbsG: 42,
        fatG: 16,
        status: 'planned',
        notes: 'Serve over rice.',
        ingredients: [
          { id: 'chicken-breast', name: 'Chicken breast', quantity: 1.5, unit: 'lb', category: 'Protein' },
          { id: 'broccoli', name: 'Broccoli', quantity: 2, unit: 'cup', category: 'Produce' },
          { id: 'soy-sauce', name: 'Soy sauce', quantity: 3, unit: 'tbsp', category: 'Condiments & Spices' },
          { id: 'rice', name: 'Rice', quantity: 2, unit: 'cup', category: 'Grains & Bread' },
        ],
        instructions: [
          {
            heading: 'Prep',
            steps: [
              'Cut the chicken breast into 1-inch cubes and pat dry with a paper towel.',
              'Cut the broccoli into bite-sized florets.',
              'Cook the rice according to package directions.',
            ],
          },
          {
            heading: 'Cook',
            steps: [
              'Heat a large skillet or wok over high heat until shimmering.',
              'Add the chicken in a single layer and sear 3-4 minutes per side until golden and cooked through, then remove from the pan.',
              'Add the broccoli to the same pan and stir-fry 2-3 minutes until bright green and just tender.',
              'Return the chicken to the pan, add the soy sauce, and toss everything together for 1 minute until evenly coated.',
              'Serve hot over the cooked rice.',
            ],
          },
        ],
      },
    ],
    schedule,
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="content">
    <header class="topbar">
      <div>
        <p class="eyebrow">Data</p>
        <h1>Import/Export</h1>
      </div>
    </header>

    <input ref="importFileInput" class="file-input" type="file" accept="application/json,.json" @change="importMealsFromFile" />
    <p v-if="importMessage" class="import-status">{{ importMessage }}</p>

    <section class="tool-grid" aria-label="Import and export tools">
      <article class="tool-panel data-tool-panel">
        <div class="tool-panel-heading">
          <FileJson :size="24" />
          <div>
            <h2>ChatGPT template</h2>
            <p>Copy this JSON shape into your AI conversation to generate meals and a schedule. Share pantry photos and confirm quantities; ingredients marked alreadyOwned will be checked off for the imported week. You can uncheck them in Groceries.</p>
          </div>
        </div>

        <div class="data-tool-actions">
          <button class="utility-action" type="button" @click="getTemplate">
            <Download :size="18" /> Download file
          </button>
          <button class="utility-action" type="button" @click="copyJson(templateJson, 'template JSON')">
            <Clipboard :size="18" /> Copy JSON
          </button>
        </div>
      </article>

      <article class="tool-panel data-tool-panel">
        <div class="tool-panel-heading">
          <Download :size="24" />
          <div>
            <h2>Export data</h2>
            <p>Save or copy meals and schedule entries for the selected date range, e.g. to paste back into ChatGPT for revisions.</p>
          </div>
        </div>

        <div class="export-range-controls">
          <div class="exercise-mode-toggle export-range-toggle" role="group" aria-label="Export range">
            <button
              type="button"
              class="exercise-mode-button"
              :class="{ active: exportRangeMode === 'current-month' }"
              @click="exportRangeMode = 'current-month'"
            >
              Current month
            </button>
            <button
              type="button"
              class="exercise-mode-button"
              :class="{ active: exportRangeMode === 'custom' }"
              @click="exportRangeMode = 'custom'"
            >
              Date range
            </button>
          </div>

          <div v-if="exportRangeMode === 'custom'" class="export-date-fields">
            <label class="form-field">
              <span>Start date</span>
              <input v-model="exportStartDate" type="date" />
            </label>
            <label class="form-field">
              <span>End date</span>
              <input v-model="exportEndDate" type="date" />
            </label>
          </div>

          <p class="export-range-summary">
            Exporting {{ filteredExportMeals.length }} meals and {{ filteredExportSchedule.length }} schedule entries from {{ resolvedExportRange.startDate }} to {{ resolvedExportRange.endDate }}.
          </p>
        </div>

        <div class="data-tool-actions">
          <button class="utility-action" type="button" @click="exportMeals">
            <Download :size="18" /> Download file
          </button>
          <button class="utility-action" type="button" @click="copyJson(exportJson, 'export JSON')">
            <Clipboard :size="18" /> Copy JSON
          </button>
        </div>
      </article>

      <article class="tool-panel data-tool-panel">
        <div class="tool-panel-heading">
          <Upload :size="24" />
          <div>
            <h2>Import data</h2>
            <p>Paste the JSON ChatGPT generated (matching the template shape) or import a downloaded file.</p>
          </div>
        </div>

        <div class="data-tool-actions">
          <button class="utility-action" type="button" :disabled="isImporting" @click="triggerImport">
            <Upload :size="18" /> Choose file
          </button>
          <button class="utility-action" type="button" :disabled="isImporting" @click="openPasteImportModal">
            <Clipboard :size="18" /> Paste JSON
          </button>
        </div>
      </article>
    </section>

    <Teleport to="body">
      <div v-if="isPasteImportModalOpen" class="modal-overlay" @click.self="closePasteImportModal">
        <div class="modal-card import-modal-card" role="dialog" aria-modal="true" aria-label="Paste JSON import">
          <header class="modal-header">
            <h3>Paste JSON</h3>
            <button class="icon-action" type="button" aria-label="Close" :disabled="isImporting" @click="closePasteImportModal">
              <X :size="18" />
            </button>
          </header>

          <label class="data-text-panel">
            <span>NutriLog JSON</span>
            <textarea v-model="pastedImportData" rows="12" placeholder="Paste NutriLog JSON here" :disabled="isImporting"></textarea>
          </label>

          <p v-if="isImporting" class="import-loading-status" aria-live="polite">
            <LoaderCircle class="import-spinner" :size="18" /> Saving meals, ingredients, and schedule...
          </p>

          <footer class="modal-footer">
            <button class="secondary-action" type="button" :disabled="isImporting" @click="closePasteImportModal">Cancel</button>
            <button class="primary-action" type="button" :disabled="isImporting || !pastedImportData.trim()" @click="importPastedMeals">
              <LoaderCircle v-if="isImporting" class="import-spinner" :size="18" />
              <Upload v-else :size="18" />
              {{ isImporting ? 'Importing...' : 'Import JSON' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
</template>
