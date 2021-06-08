'use strict'
const commander = require('commander')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const semver = require('semver')
const spawn = require('child_process').spawn

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
	checkIfOnline,
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
	const {
		allDependencies,
		isOnline,
		packageInfo,
		supportsTemplates,
		templateInfo,
	} = await run(
		root,
		appName,
		scriptsVersion,
		originalDirectory,
		template,
		useYarn
	)
	await install(root, useYarn, allDependencies, isOnline)
	await finish(packageInfo, supportsTemplates, templateInfo)
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
	const templateInfo = await getPackageInfo(templateToInstall)
	const packageInfo = await getPackageInfo(packageToInstall)
	const isOnline = checkIfOnline(useYarn)
	let packageVersion = semver.coerce(packageInfo.version)

	const templatesVersionMinimum = '3.3.0'

	// Assume compatibility if we can't test the version.
	if (!semver.valid(packageVersion)) {
		packageVersion = templatesVersionMinimum
	}
	// Only support templates when used alongside new react-scripts versions.
	const supportsTemplates = semver.gte(packageVersion, templatesVersionMinimum)
	if (supportsTemplates) {
		allDependencies.push(templateToInstall)
	} else if (template) {
		console.log(
			`The ${chalk.cyan(packageInfo.name)} version you're using ${
				packageInfo.name === 'react-scripts' ? 'is not' : 'may not be'
			} compatible with the ${chalk.cyan('--template')} option.`
		)
	}

	console.log(
		`Installing ${chalk.cyan('vue')}, and ${chalk.cyan(packageInfo.name)}${
			supportsTemplates ? ` with ${chalk.cyan(templateInfo.name)}` : ''
		}...`
	)
	return {
		allDependencies,
		isOnline,
		packageInfo,
		supportsTemplates,
		templateInfo,
	}
}

async function install(root, useYarn, dependencies, isOnline) {
	return new Promise((resolve, reject) => {
		let command
		let args
		if (useYarn) {
			command = 'yarn'
			args = ['add', '--exact']
			if (!isOnline) {
				args.push('--offline')
			}
			args.push(...dependencies)
			args.push('--cwd')
			args.push(root)
			if (!isOnline) {
				console.log(
					chalk.yellow(`
				You appear to be offline.
				Falling back to the local Yarn cache.`)
				)
			}
		} else {
			command = 'npm'
			args = [
				'install',
				'--save',
				'--save-exact',
				'--loglevel',
				'error',
			].concat(dependencies)
		}
		const child = spawn(command, args, { stdio: 'inherit' })
		child.on('close', (code) => {
			if (code !== 0) {
				reject({
					command: `${command} ${args.join(' ')}`,
				})
				return
			}
			resolve()
		})
	})
}

async function finish(packageInfo, supportsTemplate, templateInfo) {
	const packageName = packageInfo.name
	const templateName = supportsTemplate ? templateInfo.name : undefined
	checkNodeVersion(packageName)
	setCaretRange(packageName)
	await executeNodeScript()
}

module.exports = { init }
