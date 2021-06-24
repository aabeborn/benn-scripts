#!/usr/bin/env node
'use strict'

import { Commands } from './helpers/enums'
import { spawnSync } from 'child_process'
import chalk from 'chalk'

const args = process.argv.slice(2)

const scriptIndex = args.findIndex(
	(item) => Commands[item as keyof typeof Commands]
)
console.log(scriptIndex)
let scriptArgs = scriptIndex > 0 ? args.slice(0, scriptIndex) : []
scriptArgs = scriptArgs.concat(args.slice(scriptIndex + 1))
if (scriptIndex > -1) {
	console.log(process.execPath)
	const result = spawnSync(
		process.execPath,
		scriptArgs.concat(require(`./commands/${args[scriptIndex]}`)),
		{
			stdio: 'inherit',
			shell: process.platform === 'win32',
		}
	)
	if (result.signal) {
		if (result.signal === 'SIGKILL') {
			console.log(
				'The build failed because the process exited too early. ' +
					'This probably means the system ran out of memory or someone called ' +
					'`kill -9` on the process.'
			)
		} else if (result.signal === 'SIGTERM') {
			console.log(
				'The build failed because the process exited too early. ' +
					'Someone might have called `kill` or `killall`, or the system could ' +
					'be shutting down.'
			)
		}
		process.exit(1)
	}
	process.exit(result?.status || 0)
} else {
	console.log(
		chalk.red(
			'Unknown script run.\nPlease use a different script, or update the @bscripts/vue-vite-scripts package'
		)
	)
	process.exit(1)
}
