import { ref, watch } from 'vue'

const STORAGE_KEY = 'sidebar-open'
const DESKTOP_QUERY = '(min-width: 768px)'   // Tailwind `md`

// Module-level refs — shared by every component that calls useSidebar()
const isDesktop = ref(true)
const open      = ref(true)

let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const mql = window.matchMedia(DESKTOP_QUERY)
  isDesktop.value = mql.matches

  // The collapsed/expanded preference is a desktop notion only: on phones the
  // sidebar is an overlay that always starts closed.
  const stored = localStorage.getItem(STORAGE_KEY)
  open.value = isDesktop.value ? stored !== 'closed' : false

  mql.addEventListener('change', (e) => {
    isDesktop.value = e.matches
    open.value = e.matches ? localStorage.getItem(STORAGE_KEY) !== 'closed' : false
  })

  // Only persist what the user chose on desktop, so a resize to mobile (which
  // force-closes the sidebar) doesn't overwrite their preference.
  watch(open, (val) => {
    if (isDesktop.value) localStorage.setItem(STORAGE_KEY, val ? 'open' : 'closed')
  })
}

export function useSidebar() {
  init()

  return {
    isDesktop,
    sidebarOpen: open,
    setSidebarOpen: (val: boolean) => { open.value = val },
    toggleSidebar:  () => { open.value = !open.value },
  }
}
