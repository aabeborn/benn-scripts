'use strict'
import chalk from 'chalk'
import envinfo from 'envinfo'
import fs from 'fs-extra'
import path from 'path'
import { version, name } from '../../package.json'
import dns from 'dns'
import { URL } from 'url'
import { execSync } from 'child_process'
import { Framework } from './enums'

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

export function isSafeToCreateProject(root: string, name: string): void {
	// validFiles = [
	// 	'.DS_Store',
	// 	'.git',
	// 	'.gitattributes',
	// 	'.gitignore',
	// 	'.gitlab-ci.yml',
	// 	'.hg',
	// 	'.hgcheck',
	// 	'.hgignore',
	// 	'.idea',
	// 	'.npmignore',
	// 	'.travis.yml',
	// 	'docs',
	// 	'LICENSE',
	// 	'README.md',
	// 	'mkdocs.yml',
	// 	'Thumbs.db',
	// ]
	const regExp = new RegExp(
		/^(docs | LICENSE | \.(DS_Store | git | gitattributes | gitignore | *.yml | yml | hg | hgcheck | idea | npmignore | md | db))$/
	)
	const errorsLog = ['npm-debug.log', 'yarn-error.log', 'yarn-debug.log']
	const isErrorLog = (file: string): boolean => {
		return errorsLog.some((pattern) => file.startsWith(pattern))
	}
	const conflicts = fs
		.readdirSync(root)
		.filter(
			(file) => !file.match(regExp) && !/\.iml$/.test(file) && !isErrorLog(file)
		)
	if (conflicts.length > 0) {
		console.log(
			chalk.red(
				`The directory ${chalk.green(
					name
				)} contains files that could conflicts:`
			)
		)
		for (const file of conflicts) {
			try {
				const stats = fs.lstatSync(path.join(root, file))
				if (stats.isDirectory()) {
					console.log(`-${chalk.blue(`${file}/`)}`)
				} else {
					console.log(`-${file}`)
				}
			} catch (e) {
				console.log(`-${file}`)
			}
		}
		console.log(
			chalk.cyan('Please remove the files or use a new folder or project name')
		)
		process.exit(1)
	}
	// Remove any log files from a previous installation
	fs.readdirSync(root).forEach((file) => {
		if (isErrorLog(file)) {
			fs.removeSync(path.join(root, file))
		}
	})
}

export async function isOnline(useYarn: boolean): Promise<void> {
	if (!useYarn) return
	return new Promise((resolve) => {
		dns.lookup('registry.yarnpkg.com', (err) => {
			let proxy = getProxy()
			if (err != null && proxy) {
				// If a proxy is defined, we likely can't resolve external hostnames.
				// Try to resolve the proxy name as an indication of a connection.
				dns.lookup(new URL(proxy).hostname, (proxyErr) => {
					if (proxyErr) {
						console.error(
							chalk.red(
								'It seems that your proxy configuration is wrong. Please update it or remove it.'
							)
						)
						process.exit(1)
					}
					return resolve()
				})
			} else {
				if (err)
					console.error(
						chalk.red(
							'It seems that you are offline.\n You need to be online to create the application. \n Please fix your connection.'
						)
					)
				return resolve()
			}
		})
	})
}

function getProxy(): string | undefined {
	if (process.env.https_proxy) {
		return process.env.https_proxy
	} else {
		try {
			// Trying to read https-proxy from .npmrc
			const httpsProxy = execSync('npm config get https-proxy')
				.toString()
				.trim()
			return httpsProxy !== 'null' ? httpsProxy : undefined
		} catch (e) {
			return
		}
	}
}

export function getPackageAndTemplate(
	language: string,
	builder: string,
	framework: string
): { packageName: string; templateName: string } {
	console.log(language)
	let packageName = '@bscripts/'
	let templateName = '@bscripts/'
	packageName += `${framework}-${builder}-scripts`.toLowerCase()
	templateName += `${framework}-${builder}-template`.toLowerCase()
	return { packageName, templateName }
}

export function getAllDependencies(framework: Framework): string[] {
	if (framework === Framework.react) {
		return ['react', 'react-dom']
	}
	if (framework === Framework.vue) {
		return ['vue']
	}
	if (framework === Framework.vanilla) {
		return []
	}
	console.log(
		chalk.red('Invalid framework has been selected. Please select a valid one')
	)
	process.exit(1)
}
