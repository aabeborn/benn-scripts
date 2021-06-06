import {execSync, spawnSync} from "child_process";
import chalk from "chalk"

export function canUseYarn(): Boolean {
    try {
        execSync("yarn --version", {stdio: "ignore"})
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
        if(!line)
            throw new Error()
        const npmCwd = line.substring(prefix.length)
        if(npmCwd !== cwd)
            throw new Error("nopermissions")
    } catch (err) {
        if(err.message !== "nopermissions")
            console.error(chalk.red("Can't check if npm has permissions on current folder.\N Please verify your npm installation"))
        else
            console.error(chalk.red(`Npm couldn't start a process in the folder ${cwd}`))
            console.error(chalk.red('Please fix the permissions or change the folder'))
            if(process.platform === "win32") {
                console.log(chalk.yellow("On Windows, this can usually be fixed by running:"))
                console.log(`${chalk.yellow('reg')} delete "HKCU\\\\Software\\\\Microsoft\\\\Command Processor" /v AutoRun /f\\n`)
                console.log(`${chalk.yellow('reg')} delete "HKLM\\\\\\\\Software\\\\\\\\Microsoft\\\\\\\\Command Processor" /v AutoRun /f\\\\n`)
                console.log('\nTry to run the above two lines in the terminal.\nTo learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/')
            }
    }
}

// export function setYarnRegistry(): void {
//     let useDefaultRegistry = true;
//     try {
//
//     }
// }