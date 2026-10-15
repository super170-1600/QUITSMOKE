import { afterEach, expect, it, vi } from 'vitest'
import { withReadDeadline } from './readDeadline'
afterEach(() => vi.useRealTimers())
it('ends a stalled read and handles its later rejection', async () => {
  vi.useFakeTimers()
  let reject!: (error: Error) => void
  const result = withReadDeadline(new Promise((_, fail) => { reject = fail }))
  const assertion = expect(result).rejects.toThrow('读取超时')
  await vi.advanceTimersByTimeAsync(15000)
  await assertion
  reject(new Error('late network failure'))
  await Promise.resolve()
  expect(vi.getTimerCount()).toBe(0)
})
it('preserves successful empty records and original permission errors', async () => {
  vi.useFakeTimers()
  expect(await withReadDeadline(Promise.resolve(null))).toBeNull()
  await expect(withReadDeadline(Promise.reject(new Error('没有权限')))).rejects.toThrow('没有权限')
  expect(vi.getTimerCount()).toBe(0)
})
