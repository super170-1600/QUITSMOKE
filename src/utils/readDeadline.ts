/** Bounds UI waits for reads only; never use for writes whose outcome may be unknown. */
export async function withReadDeadline<T>(read: PromiseLike<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(read),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('读取超时，请检查网络后重试')), milliseconds)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
