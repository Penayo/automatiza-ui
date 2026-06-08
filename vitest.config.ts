import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals:     true,
    },
    resolve: {
        alias: {
            '@':           fileURLToPath(new URL('./src', import.meta.url)),
            '@pages':      fileURLToPath(new URL('./src/pages', import.meta.url)),
            '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
            '@layout':     fileURLToPath(new URL('./src/layout', import.meta.url)),
            '@services':   fileURLToPath(new URL('./src/services', import.meta.url)),
            '@docs':       fileURLToPath(new URL('./src/docs', import.meta.url)),
        },
    },
});
