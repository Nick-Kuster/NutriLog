import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia } from 'pinia'

test('completion affects only one occurrence and survives moves and schedule replacement', async () => {
  const server = await createServer({
    configFile: false, envFile: false, server: { middlewareMode: true },
    plugins: [{
      name: 'schedule-test-backend', enforce: 'pre',
      load(id) {
        if (id.replaceAll('\\', '/').endsWith('/src/lib/supabase.js')) {
          return 'export const supabase = null; export async function requireSupabaseUser() { return null }'
        }
      },
    }],
  })
  try {
    const { useScheduleStore } = await server.ssrLoadModule('/src/stores/schedule.js')
    const store = useScheduleStore(createPinia())
    for (const date of ['2026-09-07', '2026-09-09', '2026-09-11']) await store.scheduleMeal(date, 'smoothie')
    await store.setScheduledMealCompleted('2026-09-07', 'smoothie', true)
    assert.deepEqual(store.schedule.map((item) => item.isCompleted), [true, false, false])
    await store.setScheduledMealCompleted('2026-09-09', 'smoothie', true)
    await store.setScheduledMealCompleted('2026-09-07', 'smoothie', false)
    assert.deepEqual(store.schedule.map((item) => item.isCompleted), [false, true, false])
    await store.moveScheduledMeal('2026-09-09', 'smoothie', '2026-09-10', 0)
    await store.replaceSchedule(JSON.parse(JSON.stringify(store.schedule)))
    assert.equal(store.schedule.find((item) => item.date === '2026-09-10').isCompleted, true)
    assert.equal(store.schedule.find((item) => item.date === '2026-09-11').isCompleted, false)
    await store.scheduleMeal('2026-09-14', 'smoothie')
    assert.equal(store.schedule.find((item) => item.date === '2026-09-14').isCompleted, false)
    await assert.rejects(store.setScheduledMealCompleted('2026-10-01', 'smoothie', true), /not found/)
  } finally {
    await server.close()
  }
})
