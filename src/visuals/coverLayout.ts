/** Normalized top-left artwork placement, shared by WebGL and the static fallback. */
export function coverLayout(width: number, height: number, imageAspect = 1672 / 941) {
  if (width < 700) return { x: -.06, y: .22, width: 1.7, height: 1.7 * width / height / imageAspect }
  const viewportAspect = width / height
  const w = Math.max(1, imageAspect / viewportAspect)
  const h = Math.max(1, viewportAspect / imageAspect)
  return { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h }
}
export const COVER_ENTRY_DURATION_MS = 1700
