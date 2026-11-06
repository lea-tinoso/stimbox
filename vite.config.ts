import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The commit Vercel built, shown in the about window.
  define: {
    __BUILD__: JSON.stringify(
      (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
    ),
  },
})
