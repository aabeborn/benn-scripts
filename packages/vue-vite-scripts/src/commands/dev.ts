import { createServer } from 'vite'

;(async () => {
	const server = await createServer({
		configFile: false,
		root: process.cwd(),
	})
	await server.listen()
})()
