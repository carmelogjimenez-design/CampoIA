import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'CAMPO',
                short_name: 'CAMPO',
                description: 'Plataforma de desarrollo de futbolistas para coaches personales.',
                theme_color: '#1D1D1F',
                background_color: '#1D1D1F',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                lang: 'es',
                icons: [
                    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                navigateFallbackDenylist: [/^\/functions\//],
                runtimeCaching: [
                    {
                        // Cachea la app; las llamadas a Supabase van siempre a la red
                        urlPattern: function (_a) {
                            var url = _a.url;
                            return url.origin.includes('supabase.co');
                        },
                        handler: 'NetworkOnly',
                    },
                ],
            },
        }),
    ],
});
