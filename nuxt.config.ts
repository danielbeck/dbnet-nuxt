// https://nuxt.com/docs/api/configuration/nuxt-config

import { defineNuxtConfig } from 'nuxt/config'

// Compute prerender routes at config evaluation time so Nitro receives an array
const getPrerenderRoutes = (await import('./getPrerenderRoutes.mjs')).default;
const prerenderRoutes = await getPrerenderRoutes();

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: prerenderRoutes,
    }
  },
  // Deprecated top-level `prerender` removed; nitro.prerender is used above.
});
