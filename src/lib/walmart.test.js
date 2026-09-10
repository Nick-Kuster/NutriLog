import test from 'node:test'
import assert from 'node:assert/strict'
import { walmartCartUrl, walmartItemId, walmartReviewRows, walmartReviewState } from './walmart.js'
import { aggregateGroceryItems } from './groceryAggregation.js'

test('all needed groceries start selected, including missing product links', () => {
  const rows = walmartReviewRows([
    { reviewKey: 'rice', name: 'Rice', walmartUrl: 'https://www.walmart.com/ip/123' },
    { reviewKey: 'milk', name: 'Milk' },
  ])
  assert.ok(rows.every((row) => row.selected))
  const cart = walmartReviewState(rows)
  assert.equal(cart.selected.length, 2)
  assert.equal(cart.missing[0].name, 'Milk')
  assert.equal(new URL(cart.url).searchParams.get('items'), '123_1')
  rows[1].url = 'https://www.walmart.com/ip/456'
  assert.equal(walmartReviewState(rows).matched.length, 2)
  rows[1].packages = 0
  assert.equal(walmartReviewState(rows).url, '')
  assert.equal(walmartReviewState(rows).invalidCounts.length, 1)
})

test('refreshing groceries retains user edits and removes checked items from review', () => {
  const items = [{ reviewKey: 'rice' }, { reviewKey: 'milk' }]
  const rows = walmartReviewRows(items)
  Object.assign(rows[0], { url: 'https://www.walmart.com/ip/123', packages: 3, selected: false })
  const next = walmartReviewRows([items[0], { reviewKey: 'eggs' }], rows)
  assert.equal(next[0].packages, 3)
  assert.equal(next[0].selected, false)
  assert.equal(next[0].url, rows[0].url)
  assert.equal(next[1].selected, true)
  assert.ok(!next.some((row) => row.reviewKey === 'milk'))
})

test('accept only Walmart product URLs, not lookalike domains or search URLs', () => {
  assert.equal(walmartItemId('https://www.walmart.com/ip/Rice/123?foo=bar'), '123')
  assert.equal(walmartItemId('https://walmart.com/ip/123'), '123')
  for (const value of ['https://walmart.com.evil.com/ip/123', 'javascript:alert(1)', 'https://www.walmart.com/search?q=rice', '', '123']) {
    assert.equal(walmartItemId(value), '')
  }
})
test('combine explicit package counts for identical products and reject invalid selections', () => {
  const url = 'https://www.walmart.com/ip/123'
  assert.equal(new URL(walmartCartUrl([{ url, quantity: 2 }, { url, quantity: 3 }])).searchParams.get('items'), '123_5')
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '']) assert.equal(walmartCartUrl([{ url, quantity }]), '')
  assert.equal(walmartCartUrl([]), '')
  assert.equal(walmartCartUrl([{ url: 'bad', quantity: 1 }]), '')
})
test('conflicting or missing product mappings require review without losing grocery totals', () => {
  const ingredient = { name: 'Rice', quantity: 2, unit: 'cup', walmartUrl: 'https://www.walmart.com/ip/123' }
  const items = aggregateGroceryItems([
    { name: 'A', ingredients: [ingredient] },
    { name: 'B', ingredients: [{ ...ingredient, walmartUrl: 'https://www.walmart.com/ip/456' }] },
    { name: 'C', ingredients: [ingredient] },
  ])
  assert.equal(items[0].quantity, 6)
  assert.equal(items[0].walmartUrl, '')
})
