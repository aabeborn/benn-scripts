const envinfo = require('envinfo')
const chalk = require('chalk')
const got = require('got')
const exec = require('child_process').execSync
const semver = require('semver')
const validateProjectName = require('validate-npm-package-name')
const fs = require('fs-extra')
const { version, name } = require('../package.json')
const deps = ['vue', '@bscripts/scripts']

async function printEnvInfo(info) {
	console.log(chalk.bold('\nEnvironment info:'))
	console.log(`current version of ${name}: ${version}`)
	console.log(`running from ${__dirname}`)
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

function checkProjectName(programName, name) {
	if (!name) {
		console.log(`Please specify the project directory
        \t${chalk.cyan(programName)} ${chalk.green('<project-directory>')}\n
        \t For example:
        \t\t${chalk.cyan(programName)} ${chalk.green('my-app')}\n
        \tRun ${chalk.cyan(`${programName} --help`)} to see all options.
        `)
		process.exit(1)
	}
}

async function checkScriptVersion() {
	let latest
	try {
		const response = await got(
			'https://registry.npmjs.org/-/package/@bscripts%2Fcreate-app/dist-tags'
		)
		if (response.statusCode === 200) {
			latest = JSON.parse(response.body).latest
		} else {
			latest = exec(`npm view ${name} version`).toString().trim()
		}
	} catch (err) {
		console.error(
			chalk.red(`Something went wrong trying to get version of ${name}`)
		)
		process.exit(1)
	}
	if (latest && semver.lt(version, latest)) {
		console.error(
			chalk.yellow(`
        You are running \`bscripts-create-app\` ${version}, which is behind the latest release ${latest}\n\n
        Please remove any global installs with one of the following commands:
        \t- npm uninstall -g ${name}
        \t- yarn global remove ${name} 
        \nAnd then reinstall it by using of of the following commands:
        \t- npm install -g ${name}
        \t- yarn global add ${name} 
        `)
		)
		process.exit(1)
	}
}

function checkNodeVersion() {
	const unsupported = !semver.satisfies(process.version, '>=10')
	if (unsupported) {
		console.log(
			chalk.red(`
        You are using Node ${process.version} which is unsupported.
        Please update it to at least version 10!
        `)
		)
	}
}

function checkAppName(name) {
	const isValid = validateProjectName(name)
	if (!isValid.validForNewPackages) {
		console.error(
			chalk.red(`
            Cannot create a project named ${chalk.cyan(
							name
						)} because of npm naming restrictions:\n
        `)
		)
		const errors = [...(isValid.errors || []), ...(isValid.warnings || [])]
		errors.forEach((error) => {
			console.error(chalk.red(`  * ${error}`))
		})
		console.error(chalk.red('\nPlease choose a different project name.'))
		process.exit(1)
	}
	if (deps.includes(name)) {
		console.error(
			chalk.red(`
        Cannot create a project called ${chalk.cyan(
					name
				)} because a dependency with the same name exists.\n
        Due to the way npm works the following name are not allowed:
        ${chalk.cyan(deps.map((dep) => `${dep}\n`))}
        Please choose a different project name.
        `)
		)
		process.exit(1)
	}
}

function isSafe(dir, name) {
	const validFiles = [
		'.DS_Store',
		'.git',
		'.gitattributes',
		'.gitignore',
		'.gitlab-ci.yml',
		'.hg',
		'.hgcheck',
		'.hgignore',
		'.idea',
		'.npmignore',
		'.travis.yml',
		'docs',
		'LICENSE',
		'README.md',
		'mkdocs.yml',
		'Thumbs.db',
	]
	// These files should be allowed to remain on a failed install, but then
	// silently removed during the next create.
	const errorLogFilePatterns = [
		'npm-debug.log',
		'yarn-error.log',
		'yarn-debug.log',
	]
	const isErrorLog = (file) => {
		return errorLogFilePatterns.some((pattern) => file.startsWith(pattern))
	}
	const conflicts = fs
		.readdirSync(dir)
		.filter((file) => !validFiles.includes(file))
		// IntelliJ IDEA creates module files before CRA is launched
		.filter((file) => !/\.iml$/.test(file))
		// Don't treat log files from previous installation as conflicts
		.filter((file) => !isErrorLog(file))
	if (conflicts.length > 0) {
		console.log(`
        ${chalk.cyan(dir)} directory contains files that could conflict:
        ${conflicts.forEach((file) => `${chalk.yellow(file)}\n`)}
        Try using a new directory name, or remove the files listed above.
        `)
		return false
	}
	// Remove any log files from a previous installation.
	fs.readdirSync(dir).forEach((file) => {
		if (isErrorLog(file)) {
			fs.removeSync(path.join(dir, file))
		}
	})
	return true
}

module.exports = {
	printEnvInfo,
	checkProjectName,
	checkScriptVersion,
	checkNodeVersion,
	checkAppName,
}
