'use strict'
import chalk from 'chalk'
import envinfo from 'envinfo'
import { version, name } from '../../package.json'

const NODE_LAST_SUPPORTED_VERSION = 10

export function isNodeSupported(): void {
	const nodeVersion = process.versions.node
	const major: number = +nodeVersion.split('.')[0]
	if (major < NODE_LAST_SUPPORTED_VERSION) {
		console.error(
			chalk.red(
				`You are running an overage Node version (${nodeVersion}).\nPlease update it at least major version ${NODE_LAST_SUPPORTED_VERSION}.`
			)
		)
		process.exit(1)
	}
}

export async function printInfo(): Promise<void> {
	console.log(chalk.bold('Environment info:'))
	console.log(`current version of ${name}: ${version}`)
	console.log(`running from ${process.cwd()}`)
	return envinfo
		.run(
			{
				System: ['OS', 'CPU'],
				Binaries: ['Node', 'npm', 'Yarn'],
				Browsers: ['Chrome', 'Edge', 'Internet Explorer', 'Firefox', 'Safari'],
				npmPackages: ['vue', '@bscripts/scripts'],
				npmGlobalPackages: ['bscripts-create-app'],
			},
			{
				duplicates: true,
				showNotFound: true,
			}
		)
		.then(console.log)
}

export function isOnline(): Boolean {
	return true
}
