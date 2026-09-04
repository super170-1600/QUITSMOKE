import { computed, ref } from 'vue'

export type DisplayMode = 'auto' | 'mobile' | 'desktop'

const STORAGE_KEY = 'quit-smoking-display-mode'
const isWideScreen = ref(false)
const displayMode = ref<DisplayMode>('auto')
let initialized = false

function isDisplayMode(value: string | null): value is DisplayMode {
  return value === 'auto' || value === 'mobile' || value === 'desktop'
}

function initializeDisplayMode() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isDisplayMode(stored)) displayMode.value = stored
  const media = window.matchMedia('(min-width: 1024px)')
  isWideScreen.value = media.matches
  media.addEventListener('change', (event) => { isWideScreen.value = event.matches })
}

const isDesktop = computed(() => displayMode.value === 'desktop' || (displayMode.value === 'auto' && isWideScreen.value))

export function useDisplayMode() {
  initializeDisplayMode()

  function setDisplayMode(mode: DisplayMode) {
    displayMode.value = mode
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, mode)
  }

  return { displayMode, isDesktop, setDisplayMode }
}
