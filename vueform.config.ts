import en from '@vueform/vueform/locales/en'
import es from '@vueform/vueform/locales/es'
import vueform from '@vueform/vueform/dist/vueform'
import { defineConfig } from '@vueform/vueform'

// You might place these anywhere else in your project
import '@vueform/vueform/dist/vueform.css';

// Both locales are registered so a form can be switched at runtime via
// form$.setLanguage(); `locale` here is only the default. See useFormLocale().
export default defineConfig({
  theme: vueform,
  locales: { en, es },
  locale: 'en',
})
