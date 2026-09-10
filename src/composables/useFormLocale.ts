import { ref, watch } from 'vue'

/**
 * Locale for rendered Vueform forms — validation messages, date pickers, built-in labels.
 *
 * Deliberately separate from the app's own chrome, which is English-only and has no i18n
 * library. This only governs what end users see inside a form. If forms should ever
 * follow the tenant rather than the browser, this is the single place to change.
 */
export type FormLocale = 'en' | 'es'

export const FORM_LOCALES: { value: FormLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

const STORAGE_KEY = 'formLocale'
const DEFAULT_LOCALE: FormLocale = 'en'

function isFormLocale(value: string | null): value is FormLocale {
  return value === 'en' || value === 'es'
}

// Module-level ref — shared across every component that calls useFormLocale()
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
const locale = ref<FormLocale>(isFormLocale(stored) ? stored : DEFAULT_LOCALE)

watch(locale, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
})

function setLocale(val: FormLocale) {
  locale.value = val
}

export function useFormLocale() {
  return { locale, setLocale, locales: FORM_LOCALES }
}
