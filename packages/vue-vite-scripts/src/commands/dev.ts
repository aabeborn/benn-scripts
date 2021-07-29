import { createServer, Plugin } from 'vite'
import vuePlugin from '@vitejs/plugin-vue'
import fs from 'fs'

;(async () => {
	const plugins = [vuePlugin()]
	if (fs.existsSync(`${process.cwd()}/bscripts.config.js`)) {
		const customConfig = await import(`${process.cwd()}/bscripts.config.js`)
		customConfig?.plugins?.forEach((plugin: Plugin) => plugins.push(plugin))
	}

	const server = await createServer({
		plugins,
		configFile: false,
		root: process.cwd(),
	})
	await server.listen()
})()
