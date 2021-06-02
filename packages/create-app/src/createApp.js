'use strict'
const commander = require('commander')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')

const {
	printEnvInfo,
	checkProjectName,
	checkScriptVersion,
	checkNodeVersion,
	checkAppName,
	isSafe,
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
	await createApp(projectName, scriptsVersion, template, useNpm)
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
}

module.exports = { init }
