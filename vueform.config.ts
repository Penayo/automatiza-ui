import en from '@vueform/vueform/locales/en'
import es from '@vueform/vueform/locales/es'
import vueform from '@vueform/vueform/dist/vueform'
import { defineConfig } from '@vueform/vueform'

// You might place these anywhere else in your project
import '@vueform/vueform/dist/vueform.css';

import DocumentListElement from './src/form-fields/vueform/DocumentListElement.vue'
import DataTableElement from './src/form-fields/vueform/DataTableElement.vue'
import AmountElement from './src/form-fields/vueform/AmountElement.vue'
import { formatCurrency, formatDate, formatNumber } from './src/utils/valueFormat'

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

/**
 * Sums one field across an array of rows, optionally only the rows whose `unit_type`
 * matches:
 *
 *   "{priced_monthly_total + SUM_FIELD(staff_services, 'price', 'MONTHLY')}"
 *
 * Vueform's own SUM cannot do this: its `list.*.field` wildcard only resolves inside a
 * list item, so from outside the array there is no way to reach a column. Blank cells
 * count as 0, so a total stays live while staff are still typing prices.
 *
 * Same registration contract as LIST: called with no arguments it returns a number,
 * which keeps it a plain function rather than a form$ factory.
 */
const SUM_FIELD = (rows: unknown, field?: unknown, unitType?: unknown): number => {
    if (!Array.isArray(rows) || typeof field !== 'string') return 0
    return rows.reduce((sum, row) => {
        if (!row || typeof row !== 'object') return sum
        if (unitType !== undefined && (row as any).unit_type !== unitType) return sum
        const value = Number((row as any)[field])
        return Number.isFinite(value) ? sum + value : sum
    }, 0)
}

/**
 * Number display for static content (forms spec §5.4):
 *
 *   "Monthly total: {CURRENCY(quote_monthly_total, 'USD')}"   "{NUMBER(hours, 1)}"   "{DATE(due)}"
 *
 * Same registration contract as LIST: called with no arguments they return '', which
 * keeps them plain functions. Output is text for display, not for further arithmetic.
 */
const NUMBER = (value?: unknown, decimals?: unknown, locale?: unknown): string =>
    formatNumber(value, decimals, locale)

const CURRENCY = (value?: unknown, code?: unknown, locale?: unknown): string =>
    formatCurrency(value, code, locale)

const DATE = (value?: unknown, locale?: unknown): string => formatDate(value, locale)

// Both locales are registered so a form can be switched at runtime via
// form$.setLanguage(); `locale` here is only the default. See useFormLocale().
export default defineConfig({
  theme: vueform,
  locales: { en, es },
  locale: 'en',
  expression: {
    functions: { LIST, SUM_FIELD, NUMBER, CURRENCY, DATE },
  },
  /**
   * Custom elements. Registered here rather than per-form because Vueform resolves an
   * element from its `type` through the global component table — a schema saying
   * `type: 'documentList'` looks for a `DocumentListElement` component and renders
   * nothing at all if one was never installed.
   */
  elements: [DocumentListElement, DataTableElement, AmountElement],
})
