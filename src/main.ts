import { createApp } from 'vue'
import './style.css'
// import './dark-form-builder.css'

import App from './App.vue'
import router from './router';
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
            light: {
                surface: {
                    0: '{emerald.50}', //bg-color
                    50: '{emerald.50}',
                    100: '{emerald.100}',
                    200: '{emerald.200}',
                    300: '{gray.300}',
                    400: '{emerald.400}',
                    500: '{emerald.700}',
                    600: '{emerald.700}',
                    700: '{zinc.700} ', // text color
                    800: '{zinc.800}',
                    900: '{zinc.900}',
                    950: '{zinc.950}'
                }
            },
            dark: {
                surface: {
                    0: '{zinc.300}', // text-color
                    50: '{gray.50}',
                    100: '{gray.100}',
                    200: '{gray.200}',
                    300: '{gray.300}',
                    400: '{gray.400}',
                    500: '{gray.500}',
                    600: '{gray.600}',
                    700: '{gray.700}',
                    800: '{zinc.700}', // border-color
                    900: '{zinc.800}', // bg-color
                    950: '{zinc.950}'
                }
            }
        }
    }
});

const app = createApp(App)
app.use(PrimeVue, {
	theme: {
		preset: MyPreset
	}
});
app.use(ToastService)
app.use(ConfirmationService)
app.use(DialogService)
app.use(Vueform, vueformConfig)
app.use(router);
app.mount('#app');
