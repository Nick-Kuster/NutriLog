import test from 'node:test'
import assert from 'node:assert/strict'
import { importedOwnedGroceries } from './ownedGroceries.js'

const meal = (id, alreadyOwned) => ({ id, ingredients: [{ name: ' Rice ', unit: 'Cup', quantity: 2, alreadyOwned }] })
test('ownership is scoped to scheduled weeks and respects the configured week start', () => {
  const data = { meals: [meal(1, true)], schedule: [{ date: '2026-09-13', mealId: 1 }] }
  assert.deepEqual(importedOwnedGroceries(data, 1), [{ weekStart: '2026-09-07', itemKey: 'rice|cup' }])
  assert.deepEqual(importedOwnedGroceries(data, 0), [{ weekStart: '2026-09-13', itemKey: 'rice|cup' }])
})
test('all uses must explicitly be owned; old imports and string booleans do not auto-check', () => {
  for (const flag of [false, undefined, 'true']) {
    const data = { meals: [meal(1, true), meal(2, flag)], schedule: [{ date: '2026-09-10', mealId: 1 }, { date: '2026-09-11', mealId: 2 }] }
    assert.deepEqual(importedOwnedGroceries(data, 0), [])
  }
})
test('duplicates produce one checkoff and unscheduled meals do not affect ownership', () => {
  const data = { meals: [meal(1, true), meal(2, false)], schedule: [{ date: '2026-09-10', mealId: 1 }, { date: '2026-09-11', mealId: 1 }] }
  assert.equal(importedOwnedGroceries(data, 0).length, 1)
  assert.equal(data.meals[0].ingredients[0].quantity, 2)
})
test('invalid dates are rejected before importing', () => {
  assert.throws(() => importedOwnedGroceries({ meals: [meal(1, true)], schedule: [{ date: '2026-02-30', mealId: 1 }] }, 0))
})
