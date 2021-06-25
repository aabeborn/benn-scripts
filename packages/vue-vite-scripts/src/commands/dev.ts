import { createServer } from 'vite'
import vuePlugin from '@vitejs/plugin-vue'

;(async () => {
	const server = await createServer({
		plugins: [vuePlugin()],
		configFile: false,
		root: process.cwd(),
	})
	await server.listen()
})()
