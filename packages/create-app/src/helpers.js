const envinfo = require('envinfo')
const chalk = require('chalk')
const got = require('got')
const exec = require('child_process').execSync
const semver = require('semver')
const validateProjectName = require('validate-npm-package-name')
const fs = require('fs-extra')
const spawn = require('cross-spawn')
const path = require('path')
const tmp = require('tmp-promise')
const { version, name } = require('../package.json')
const deps = ['vue', '@bscripts/scripts']

async function printEnvInfo() {
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

function isSafe(dir) {
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

function useYarn() {
	try {
		exec('yarn --version', { stdio: 'ignore' })
		return true
	} catch (err) {
		return false
	}
}

function checkNpmPermissions() {
	const cwd = process.cwd()
	let childOutput
	try {
		childOutput = spawn.sync('npm', ['config', 'list']).output.join('')
	} catch (err) {
		return true
	}
	if (typeof childOutput !== 'string') {
		return true
	}
	const lines = childOutput.split('\n')
	// `npm config list` output includes the following line:
	// "; cwd = C:\path\to\current\dir"
	const prefix = '; cwd = '
	const line = lines.find((line) => line.startsWith(prefix))
	if (typeof line !== 'string') {
		return true
	}
	const npmCWD = line.substring(prefix.length)
	if (npmCWD === cwd) {
		return true
	}
	console.error(
		chalk.red(`
		Could not start a npm process in this directory.
		The current directory is ${chalk.cyan(cwd)}.
		However, a newly started npm process runs in: ${npmCWD}.
		This is probably caused by a misconfigured system shell.
	`)
	)
	if (process.platform === 'win32') {
		console.error(
			chalk.red(`
		On Windows, this can usually be fixed by running
		${chalk.yellow(
			'reg'
		)} delete "HKCU\\\\Software\\\\Microsoft\\\\Command Processor" /v AutoRun /f\\n
		${chalk.yellow(
			'reg'
		)} delete "HKLM\\\\Software\\\\Microsoft\\\\Command Processor" /v AutoRun /f\\n
		Try to run the above two lines in the terminal.
		To learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/
		`)
		)
	}
	return false
}

function checkNpmVersion() {
	let hasMinNpm = false
	let npmVersion = null
	try {
		npmVersion = exec('npm --version').toString().trim()
		hasMinNpm = semver.gte(npmVersion, '6.0.0')
	} catch (err) {}
	if (!hasMinNpm) {
		console.log(
			chalk.red(`
					You are using npm ${npmVersion} which isn't supported by bscripts-create-app.
					Please update it to at least version 6.0.0.
				`)
		)
		process.exit(1)
	}
}

function setYarnRegistry(root) {
	let usesDefaultRegistry = true
	try {
		usesDefaultRegistry =
			exec('yarn config get registry').toString().trim() ===
			'https://registry.yarnpkg.com'
	} catch (err) {}
	if (usesDefaultRegistry) {
		fs.copySync(
			require.resolve('./yarn.lock.cached'),
			path.join(root, 'yarn.lock')
		)
	}
}

function getPackagesToInstall(version, directory) {
	let pkgToInstall = '@bscripts/scripts'
	const validSemver = semver.valid(version)
	if (validSemver) {
		pkgToInstall += `@${validSemver}`
	} else if (version) {
		if (version[0] === '@' && !version.includes('/')) {
			pkgToInstall += version
		}
	}
	return pkgToInstall
}

function getTemplatesToInstall(template, directory) {
	let templateToInstall = '@bscripts/template'
	if (template) {
		if (template.match(/^file:/)) {
			templateToInstall = `file:${path.resolve(
				directory,
				template.match(/^file:(.*)?$/)[1]
			)}`
		} else if (
			template.includes('://') ||
			template.match(/^.+\.(tgz|tar\.gz)$/)
		) {
			templateToInstall = template
		} else {
			const packageMatch = template.match(/^(@[^/]+\/)?([^@]+)?(@.+)?$/)
			const scope = packageMatch[1] || ''
			const templateName = packageMatch[2] || ''
			const version = packageMatch[3] || ''
			templateToInstall = `${scope}${templateToInstall}-${templateName}${version}`
		}
		return templateToInstall
	}
}

async function getPackageInfo(installPackage) {
	if (installPackage.match(/^.+\.(tgz|tar\.gz)$/)) {
		const directory = await getTemporaryDirectory()
	}
}

async function getTemporaryDirectory() {
	try {
		const obj = await tmp.dir({ unsafeCleanup: true })
		return {
			tmpdir: obj.path,
			cleanup: obj.cleanup,
		}
	} catch (err) {
		throw new Error(err)
	}
}
module.exports = {
	printEnvInfo,
	checkProjectName,
	checkScriptVersion,
	checkNodeVersion,
	checkAppName,
	useYarn,
	isSafe,
	checkNpmPermissions,
	checkNpmVersion,
	setYarnRegistry,
	getTemplatesToInstall,
	getPackagesToInstall,
}
