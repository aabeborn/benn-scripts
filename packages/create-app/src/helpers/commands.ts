"use strict"

import commander from "commander"
import {version} from "../../package.json";
import chalk from "chalk"

export function createProgram(): commander.Command{
    return commander
        .createCommand('bscripts-create-app')
        .version(version)
        .on("--help", () => {
           console.log(chalk.magenta(
               "\nbscripts-create-command is an app generator cli tool. Follow the steps and you can startup a webapp in notime."
           ))
        })
        .parse(process.argv)

}

module.exports = {
    createProgram
}