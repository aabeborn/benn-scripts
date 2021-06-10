#!/usr/bin/env node
'use strict'
// import {Command} from "commander";

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
import chalk from 'chalk'
import figlet from 'figlet'
import commander from 'commander'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import { spawn } from 'child_process'

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
	const dependencies = getAllDependencies(framework).concat(packageName)
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
	console.log(
		projectDir,
		language,
		builder,
		packageName,
		templateName,
		dependencies
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

init()
