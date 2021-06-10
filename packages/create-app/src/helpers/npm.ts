import { execSync, spawn, spawnSync } from 'child_process'
import chalk from 'chalk'
import validateProjectName from 'validate-npm-package-name'
import { dependencies } from './enums'

export function canUseYarn(): boolean {
	try {
		execSync('yarn --version', { stdio: 'ignore' })
		return true
	} catch (err) {
		// yarn is not available
		return false
	}
}

// function to check if npm has the rights to access the folder
export function checkNpmPermissions(): void {
	const cwd = process.cwd()
	let output: string
	try {
		output = spawnSync('npm', ['config', 'list']).output.join('')
		const outputLines = output.split('\n')
		const prefix = '; cwd = '
		const line = outputLines.find((line) => line.startsWith(prefix))
		if (!line) throw new Error()
		const npmCwd = line.substring(prefix.length)
		if (npmCwd !== cwd) throw new Error('nopermissions')
	} catch (err) {
		if (err.message !== 'nopermissions')
			console.error(
				chalk.red(
					"Can't check if npm has permissions on current folder.N Please verify your npm installation"
				)
			)
		else
			console.error(
				chalk.red(`Npm couldn't start a process in the folder ${cwd}`)
			)
		console.error(chalk.red('Please fix the permissions or change the folder'))
		if (process.platform === 'win32') {
			console.log(
				chalk.yellow('On Windows, this can usually be fixed by running:')
			)
			console.log(
				`${chalk.yellow(
					'reg'
				)} delete "HKCU\\\\Software\\\\Microsoft\\\\Command Processor" /v AutoRun /f\\n`
			)
			console.log(
				`${chalk.yellow(
					'reg'
				)} delete "HKLM\\\\\\\\Software\\\\\\\\Microsoft\\\\\\\\Command Processor" /v AutoRun /f\\\\n`
			)
			console.log(
				'\nTry to run the above two lines in the terminal.\nTo learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/'
			)
		}
	}
}

export function checkAppName(name: string, framework: string): void {
	const result = validateProjectName(name)
	if (!result.validForNewPackages) {
		console.error(
			chalk.red(
				`Cannot create a project named ${chalk.green(
					`"${name}"`
				)} because of npm naming restrictions:\n`
			)
		)
		const errors = [...(result.errors || []), ...(result.warnings || [])]
		errors.forEach((error) => {
			console.error(chalk.red(`- ${error}`))
		})
		console.error(chalk.red('\nPlease choose a different project name.'))
		process.exit(1)
	}
	const deps = dependencies.get(framework)
	if (deps?.includes(name)) {
		console.error(
			chalk.red(
				`Cannot create a project named ${chalk.green(
					`"${name}"`
				)} because a dependency with the same name exists.\n` +
					`Due to the way npm works, the following names are not allowed:\n\n`
			) +
				chalk.cyan(deps.map((depName) => `  ${depName}`).join('\n')) +
				chalk.red('\n\nPlease choose a different project name.')
		)
		process.exit(1)
	}
}

export async function installDeps(
	deps: string[],
	useYarn: boolean,
	root: string
): Promise<void> {
	let cmd: string
	let args: string[]
	console.log(root)
	if (useYarn) {
		cmd = 'yarn'
		args = ['add'].concat(deps)
		args.push('--cwd')
		args.push(root)
	} else {
		cmd = 'npm'
		args = ['install', '--save'].concat(deps)
	}
	return new Promise((resolve) => {
		const installProcess = spawn(cmd, args, { stdio: 'inherit' })
		installProcess.on('close', (code) => {
			if (code !== 0) {
				console.log(
					chalk.red(`\nCan't install project dependencies with command:${cmd}`)
				)
				process.exit(1)
				return
			}
			resolve()
		})
	})
}
