import { ref, watch } from 'vue'

const STORAGE_KEY = 'theme'

// Module-level ref — shared across every component that calls useTheme()
const isDark = ref(false)

function init() {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === 'dark') {
    isDark.value = true
  } else if (stored === 'light') {
    isDark.value = false
  } else {
    // No preference saved — fall back to system setting
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches

    // Keep in sync with system while no manual preference is set
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          isDark.value = e.matches
          applyToHtml(e.matches)
        }
      })
  }

  // Apply immediately on boot — before any component renders
  applyToHtml(isDark.value)
}

function applyToHtml(val: boolean) {
  document.documentElement.classList.toggle('dark', val)
  // Some third-party editors (e.g. @lab2view/vue-email-editor) detect dark mode
  // via the data-theme attribute rather than a CSS class — keep them in sync.
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
}

// Persist every change to localStorage AND apply to <html> so Tailwind dark: variants work everywhere
watch(isDark, (val) => {
  localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
  applyToHtml(val)
})

function toggle() {
  isDark.value = !isDark.value
}

function setDark(val: boolean) {
  isDark.value = val
}

export function useTheme() {
  return { isDark, toggle, setDark, init }
}
