import { execSync } from 'node:child_process'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

let gitCommit = 'unknown'
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // Git not available, use unknown
}

export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
})
