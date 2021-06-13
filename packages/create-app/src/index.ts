#!/usr/bin/env node
'use strict'
import chalk from 'chalk'
import figlet from 'figlet'
import commander from 'commander'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import { spawn, spawnSync } from 'child_process'
import {
	isNodeSupported,
	printInfo,
	isSafeToCreateProject,
	getPackageAndTemplate,
	isOnline,
	getAllDependencies,
	setCaretForDependencies,
} from './helpers'
import {
	canUseYarn,
	checkAppName,
	checkNpmPermissions,
	installDeps,
} from './helpers/npm'
import { createOptions, createProgram } from './helpers/commands'
import { browserList } from './helpers/enums'

async function init(): Promise<void> {
	console.log(
		chalk.yellowBright(
			figlet.textSync('BSCRIPTS', {
				horizontalLayout: 'controlled smushing',
			})
		)
	)
	isNodeSupported()
	const program: commander.Command = createProgram()
	const { info, useNpm } = program.opts()
	if (info) await printInfo()
	const useYarn = useNpm ? false : canUseYarn()
	if (!useYarn) {
		checkNpmPermissions()
	}
	const { language, builder, name, framework } = await createOptions()
	const projectDir = await createProject(name, framework.toLowerCase())
	const originalDirectory = process.cwd()
	process.chdir(projectDir)
	const { packageName, templateName } = getPackageAndTemplate(
		language,
		builder,
		framework
	)
	await isOnline(useYarn)
	const dependencies = getAllDependencies(framework).concat([
		packageName,
		templateName,
	])
	console.log(
		`Installing ${chalk.cyan(dependencies.toString())} with ${chalk.cyan(
			templateName
		)}`
	)
	await installDeps(dependencies, useYarn, projectDir)
	setCaretForDependencies(dependencies)
	await runScript(
		process.cwd(),
		[],
		{ root: projectDir, name, originalDirectory, templateName },
		packageName
	)
	await initTemplate(templateName, useYarn)
	console.log(chalk.green(`Success! Created ${name}`))
	console.log(chalk.yellowBright.bold("Now it's time to coding!"))
	console.log(
		chalk.magentaBright('When you are not deleting node modules folder :)')
	)
}

function createProject(projectName: string, framework: string): string {
	const root = path.resolve(projectName)
	checkAppName(projectName, framework)
	fs.ensureDirSync(projectName)
	isSafeToCreateProject(root, projectName)
	const pkgJson = {
		name: projectName,
		version: '0.1.0',
		private: true,
	}
	fs.writeFileSync(
		path.join(root, 'package.json'),
		JSON.stringify(pkgJson, null, 2) + os.EOL
	)
	return root
}

type ScriptData = {
	root: string
	name: string
	originalDirectory: string
	templateName: string
}

async function runScript(
	cwd: string,
	args: string[],
	data: ScriptData,
	pkgName: string
): Promise<void> {
	const source = `var init = require('${pkgName}'/init.js);
	init.apply(null, JSON.parse(process.argv[1]))`

	return new Promise((resolve) => {
		const scriptProcess = spawn(
			process.execPath,
			[...args, '-e', source, '--', JSON.stringify(data)],
			{ cwd, stdio: 'inherit' }
		)
		scriptProcess.on('close', (code) => {
			if (code !== 0) {
				console.error(
					chalk.red('Error while running the initialization script')
				)
				process.exit(1)
			}
			resolve()
		})
	})
}

type Template = {
	package?: {
		scripts: object
		dependencies: object
		devDependencies?: object
	}
}

async function initTemplate(template: string, useYarn: boolean) {
	const appPath = process.cwd()
	const templatePath = path.dirname(
		require.resolve(`${template}/package.json`, { paths: [process.cwd()] })
	)
	const templatePkgPath = path.join(templatePath, 'template.json')
	const pkg = require(path.join(process.cwd(), 'package.json'))
	let templateJson: Template = {}
	if (fs.existsSync(templatePkgPath)) {
		templateJson = require(templatePkgPath)
	}
	const templatePackage = templateJson.package
	if (templatePackage && templatePackage.scripts) {
		pkg.scripts = {
			...pkg.scripts,
			...templatePackage.scripts,
		}
	} else {
		console.error(
			chalk.red(
				"Can't find template scripts or dependencies. Please provide a valid template"
			)
		)
	}
	if (useYarn) {
		pkg.scripts = Object.entries(pkg.scripts).reduce(
			(acc, [key, value]) => ({
				...acc,
				// @ts-ignore
				[key]: value.replace(/(npm run |npm )/, 'yarn '),
			}),
			{}
		)
	}
	// Setup the browsers list
	pkg.browserslist = browserList
	fs.writeFileSync(
		path.join(appPath, 'package.json'),
		JSON.stringify(pkg, null, 2) + os.EOL
	)
	const readmeExists = fs.existsSync(path.join(appPath, 'README.md'))
	if (readmeExists) {
		fs.renameSync(
			path.join(appPath, 'README.md'),
			path.join(appPath, 'README.old.md')
		)
	}
	const templateDir = path.join(templatePkgPath, 'template')
	if (fs.existsSync(templateDir)) {
		fs.copySync(templateDir, appPath)
	} else {
		console.error(
			`Could not locate supplied template: ${chalk.green(templateDir)}`
		)
		return
	}

	if (useYarn) {
		try {
			const readme = fs.readFileSync(path.join(appPath, 'README.md'), 'utf8')
			fs.writeFileSync(
				path.join(appPath, 'README.md'),
				readme.replace(/(npm run |npm )/g, 'yarn '),
				'utf8'
			)
		} catch (err) {
			// Silencing the error. As it fall backs to using default npm commands.
		}
	}
	const gitignoreExists = fs.existsSync(path.join(appPath, '.gitignore'))
	if (gitignoreExists) {
		// appending entries
		const data = fs.readFileSync(path.join(appPath, 'gitignore'))
		fs.appendFileSync(path.join(appPath, '.gitignore'), data)
		fs.unlinkSync(path.join(appPath, 'gitignore'))
	} else {
		// Rename gitignore after the fact to prevent npm from renaming it to .npmignore
		fs.moveSync(
			path.join(appPath, 'gitignore'),
			path.join(appPath, '.gitignore')
		)
	}
	let command, remove, add
	if (useYarn) {
		command = 'yarn'
		remove = 'remove'
		add = ['add']
	} else {
		command = 'npm'
		remove = 'uninstall'
		add = ['install', '--save']
	}

	const dependenciesToInstall = Object.entries({
		...templatePackage?.dependencies,
		...templatePackage?.devDependencies,
	})

	if (dependenciesToInstall.length) {
		add = add.concat(
			dependenciesToInstall.map(([dep, version]) => {
				return `${dep}@${version}`
			})
		)
	}
	console.log(`Installing template dependencies using ${command}...`)
	const installProcess = spawnSync(command, add, { stdio: 'inherit' })
	if (installProcess.status !== 0) {
		console.error(chalk.red(`\`${command} ${add.join(' ')}\` failed`))
		return
	}

	console.log(`Removing template package using ${command}...`)
	const removeProcess = spawnSync(command, [remove, template], {
		stdio: 'inherit',
	})
	if (removeProcess.status !== 0) {
		console.error(chalk.red(`\`${command} ${add.join(' ')}\` failed`))
		return
	}
}

init()
