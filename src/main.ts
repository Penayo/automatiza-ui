import { createApp } from 'vue'
import './style.css'
// import './dark-form-builder.css'

import App from '@/App.vue'
import router from '@/router';
import { setRouter } from '@services/routerRef';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice';

// Vue Form
import Vueform from '@vueform/vueform'
import vueformConfig from './../vueform.config'
import { DynamicDialog } from 'primevue';

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
app.use(ToastService)
app.use(ConfirmationService)
app.use(DialogService)
app.use(Vueform, vueformConfig)
app.use(router);
setRouter(router);
app.mount('#app');
