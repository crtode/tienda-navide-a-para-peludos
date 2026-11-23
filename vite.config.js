import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const proxy = {
  "/api": {
    target: "http://127.0.0.1:3000",
    changeOrigin: true,
  },
};

export default defineConfig({
  // Redirige las peticiones al backend durante el desarrollo.
  server: {
    proxy,
  },

  // También permite probar el backend en la vista previa.
  preview: {
    proxy,
  },

  plugins: [
    VitePWA({
      manifest: false,
      injectRegister: "script-defer",

      workbox: {
        globPatterns: [
          "**/*.{html,js,css,png,jpg,jpeg,webp,avif,svg,webmanifest,ttf,woff,woff2}",
        ],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
      },
    }),
  ],

  build: {
    rolldownOptions: {
      input: {
        tienda: "index.html",
        carrito: "carrito.html",
      },
    },
  },
});

// import { defineConfig } from "vite";
// import { VitePWA } from "vite-plugin-pwa";

// export default defineConfig({
//   plugins: [
//     VitePWA({
//       // Utiliza nuestro archivo public/manifest.webmanifest.
//       manifest: false,

//       // Registra el Service Worker sin bloquear el análisis del HTML.
//       injectRegister: "script-defer",

//       workbox: {
//         // Guarda los recursos locales para utilizarlos sin conexión.
//         globPatterns: [
//           "**/*.{html,js,css,png,jpg,jpeg,webp,avif,svg,webmanifest,ttf,woff,woff2}",
//         ],

//         // Cada página utiliza su propio HTML guardado.
//         navigateFallback: null,

//         // Retira las cachés de precarga de Workbox que queden obsoletas.
//         cleanupOutdatedCaches: true,
//       },
//     }),
//   ],

//   build: {
//     rolldownOptions: {
//       input: {
//         tienda: "index.html",
//         carrito: "carrito.html",
//       },
//     },
//   },
// });
