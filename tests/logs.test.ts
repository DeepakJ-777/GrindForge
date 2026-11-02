import assert from 'node:assert/strict'
import test from 'node:test'
import { formatLogDate, relativeDay, todayString } from '../app/composables/useLogs.ts'

test('todayString returns a valid calendar date in the selected timezone', () => {
  for (const timezone of ['Asia/Kolkata', 'America/Los_Angeles', 'UTC']) {
    assert.match(todayString(timezone), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('formatLogDate formats stored ISO dates without timezone drift', () => {
  assert.equal(formatLogDate('2026-01-05'), 'Jan 5')
})

test('relativeDay identifies today and yesterday in the app timezone', () => {
  const today = todayString()
  const yesterday = new Date(`${today}T00:00:00.000Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  assert.equal(relativeDay(today), 'Today')
  assert.equal(relativeDay(yesterday.toISOString().slice(0, 10)), 'Yesterday')
})
