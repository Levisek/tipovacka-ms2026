import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tipovacka/',
  build: {
    // Vynucený single-bundle: žádné shared chunky.
    // Důvod: 2026-04-11 měl jeden uživatel cachované staré
    // schedule-D5N2uG5C.js s nekompatibilními exports vůči novému
    // main bundlu (chunk version mismatch napříč deploymenty).
    // U malé SPA nemá kód-splitting smysl, jeden ~360 kB chunk
    // je čistší a robustnější vůči stale browser/edge cache.
    rollupOptions: {
      output: {
        manualChunks: () => 'index',
      },
    },
  },
})
