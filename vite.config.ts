import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		TanStackRouterVite(),
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler'], // must run first!
			},
		}),
	],
	resolve: {
		alias: {
			'~': path.resolve(__dirname, './src'),
			'@shared': path.resolve(__dirname, './shared/src'),
		},
	},
})
