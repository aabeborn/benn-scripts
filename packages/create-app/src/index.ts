#!/usr/bin/env node
'use strict'
// import {Command} from "commander";

import { isNodeSupported, printInfo, createProject } from './helpers'
import {
	canUseYarn,
	checkNpmPermissions,
	// setYarnRegistry
} from './helpers/npm'
import { createOptions, createProgram } from './helpers/commands'
import chalk from 'chalk'
import figlet from 'figlet'
import commander from 'commander'

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
	createProject(name, framework.toLowerCase())
	console.log(language, builder)
}

init()
