import vuePlugin from '@vitejs/plugin-vue'
import fs from 'fs'
import { build, Plugin } from 'vite'

;(async () => {
	const plugins = [vuePlugin()]
	if (fs.existsSync(`${process.cwd()}/bscripts.config.js`)) {
		const customConfig = await import(`${process.cwd()}/bscripts.config.js`)
		customConfig?.plugins?.forEach((plugin: Plugin) => plugins.push(plugin))
	}
	build({
		plugins,
		configFile: false,
	})
})()
