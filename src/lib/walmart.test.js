import test from 'node:test'
import assert from 'node:assert/strict'
import { walmartCartUrl, walmartItemId } from './walmart.js'
import { aggregateGroceryItems } from './groceryAggregation.js'

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
