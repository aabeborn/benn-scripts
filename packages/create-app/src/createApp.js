'use strict'
const commander = require('commander')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')

const {
	printEnvInfo,
	checkProjectName,
	checkScriptVersion,
	checkNodeVersion,
	checkAppName,
	isSafe,
	useYarn,
	checkNpmPermissions,
	checkNpmVersion,
	setYarnRegistry,
	getPackagesToInstall,
	getTemplatesToInstall,
	getPackageInfo,
} = require('./helpers')
const pkg = require('../package.json')
const { version } = pkg

async function init() {
	let projectName
	const action = (name) => {
		projectName = name
	}
	const program = createCommand(action)
	const { info, template, scriptsVersion, useNpm } = program.opts()
	if (info) {
		console.log('pluto')
		await printEnvInfo(info)
	}
	checkProjectName(program.name(), projectName)
	await checkScriptVersion()
	const { root, appName, originalDirectory, useYarn } = await createApp(
		projectName,
		scriptsVersion,
		template,
		useNpm
	)
	await run(root, appName, scriptsVersion, originalDirectory, template, useYarn)
}

function createCommand(cb) {
	return new commander.Command('bscripts-create-app')
		.version(version)
		.arguments('<project-directory>')
		.usage(`${chalk.cyan('<project-directory>')} [options]`)
		.action((name) => {
			cb(name)
		})
		.option('--info', 'print environment debug info')
		.option(
			'--scripts-version <alternative-package>',
			'use a non-standard version of bscripts scripts'
		)
		.option(
			'--template <path-to-template>',
			'specify a template for the created project'
		)
		.option('--use-npm')
		.on('--help', () => {
			console.log(`
                Only ${chalk.cyan('<project-directory>')} is required.\n
                A custom ${chalk.magenta(
									'--script-version'
								)} can be a npm version\n
                A custom ${chalk.cyan('--template')} can be one of:
                \t - a custom template published on npm: ${chalk.green(
									'@bscripts/template-typescript'
								)}
                \t - a local path relative to the current working directory: ${chalk.green(
									'file:../my-custom-template'
								)}
                \t - a .tgz  or tar.gz archive: ${chalk.green(
									'https://mysite.com/my-custom-template-0.8.2.tgz'
								)}
            `)
		})
		.parse(process.argv)
}

async function createApp(projectName, version, template, npm) {
	checkNodeVersion()
	const root = path.resolve(name)
	const appName = path.basename(root)
	checkAppName(appName)
	fs.ensureDirSync(name)
	if (!isSafe(root, name)) {
		process.exit(1)
	}
	const pkgJson = {
		name: projectName,
		version: '0.1.0',
		private: true,
	}
	// console.log(chalk.cyan("Writing package.json"))
	fs.writeJsonSync(path.join(root, 'package.json'), pkgJson, {
		EOL: os.EOL,
		spaces: 2,
	})
	const useYarn = npm ? false : useYarn()
	const originalDirectory = process.cwd()
	if (!useYarn && !checkNpmPermissions()) {
		process.exit(1)
	}
	checkNpmVersion()
	// TODO What is yarn pnp? add it here to check stuff
	if (useYarn) {
		setYarnRegistry(root)
	}
	return { root, appName, originalDirectory, useYarn }
}

async function run(
	root,
	appName,
	version,
	originalDirectory,
	template,
	useYarn
) {
	const packageToInstall = getPackagesToInstall(version, originalDirectory)
	const templateToInstall = getTemplatesToInstall(template, originalDirectory)
	const allDependencies = ['vue', packageToInstall]

	console.log(chalk.cyan('Installing packages. This could take a while'))
	const templateInfo = getPackageInfo(templateToInstall)
}

module.exports = { init }
