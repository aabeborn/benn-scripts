#!/usr/bin/env node
'use strict'
// import {Command} from "commander";

import {
	isNodeSupported,
	printInfo,
	isSafeToCreateProject,
	getPackageAndTemplate,
	isOnline,
} from './helpers'
import { canUseYarn, checkAppName, checkNpmPermissions } from './helpers/npm'
import { createOptions, createProgram } from './helpers/commands'
import chalk from 'chalk'
import figlet from 'figlet'
import commander from 'commander'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'

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
	process.chdir(projectDir)
	const { packageName, templateName } = getPackageAndTemplate(
		language,
		builder,
		framework
	)
	await isOnline(useYarn)
	console.log(projectDir, language, builder, packageName, templateName)
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

init()
