import en from '@vueform/vueform/locales/en'
import es from '@vueform/vueform/locales/es'
import vueform from '@vueform/vueform/dist/vueform'
import { defineConfig } from '@vueform/vueform'

// You might place these anywhere else in your project
import '@vueform/vueform/dist/vueform.css';

/**
 * Renders an array as a real <ul>, for use inside a `static` element's content:
 *
 *   "<b>Aliases:</b> {LIST(path.to.array)}"
 *
 * Without this an array reaches the template through String(), which joins it with
 * bare commas — the only thing Vueform's expression engine does with one. A list of
 * inputs is the other way to show the same data, and it reads like a form asking to
 * be filled in rather than a document.
 *
 * Registration contract: Vueform calls each function once with no arguments to test
 * whether it is a factory taking form$. Returning a string for `undefined` is what
 * keeps this registered as a plain function.
 *
 * The output is still passed through Vueform's DOMPurify sanitizer; the escaping
 * here is so that a value containing markup shows as text instead of rendering.
 */
const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const LIST = (items: unknown): string => {
    if (!Array.isArray(items) || !items.length) return ''
    return `<ul class="form-list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
}

// Both locales are registered so a form can be switched at runtime via
// form$.setLanguage(); `locale` here is only the default. See useFormLocale().
export default defineConfig({
  theme: vueform,
  locales: { en, es },
  locale: 'en',
  expression: {
    functions: { LIST },
  },
})
