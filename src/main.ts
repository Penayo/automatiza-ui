import { createApp } from 'vue'
import './style.css'

import App from '@/App.vue'
import router from '@/router';
import { useTheme } from '@/composables/useTheme';
import { setRouter } from '@services/routerRef';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice';
import Tooltip from 'primevue/tooltip';

// Vue Form
import Vueform from '@vueform/vueform'
import vueformConfig from './../vueform.config'

const MyPreset = definePreset(Aura, {
    semantic: {
        colorScheme: {
            // Light: white/zinc-50 backgrounds, zinc-900 text
            light: {
                surface: {
                    0:   '{zinc.50}',
                    50:  '{zinc.50}',
                    100: '{zinc.100}',
                    200: '{zinc.200}',
                    300: '{zinc.300}',
                    400: '{zinc.400}',
                    500: '{zinc.500}',
                    600: '{zinc.600}',
                    700: '{zinc.700}',
                    800: '{zinc.800}',
                    900: '{zinc.900}',
                    950: '{zinc.950}'
                }
            },
            // Dark: zinc-950/900 backgrounds, zinc-100 text
            dark: {
                surface: {
                    0:   '{zinc.100}',
                    50:  '{zinc.200}',
                    100: '{zinc.300}',
                    200: '{zinc.400}',
                    300: '{zinc.500}',
                    400: '{zinc.500}',
                    500: '{zinc.600}',
                    600: '{zinc.700}',
                    700: '{zinc.800}',
                    800: '{zinc.800}',
                    900: '{zinc.900}',
                    950: '{zinc.950}'
                }
            }
        }
    }
});

// Resolve the theme BEFORE the first render. Components pick their skin from
// useTheme().isDark while global CSS keys off .dark on <html>; if the two are
// resolved at different times they disagree for the first paint.
useTheme().init();

const app = createApp(App)
app.use(PrimeVue, {
	theme: {
		preset: MyPreset,
		options: {
			// Make PrimeVue follow the .dark class on <html> instead of prefers-color-scheme
			darkModeSelector: '.dark'
		}
	}
});
app.directive('tooltip', Tooltip)
app.use(ToastService)
app.use(ConfirmationService)
app.use(DialogService)
app.use(Vueform, vueformConfig)
app.use(router);
setRouter(router);
app.mount('#app');
