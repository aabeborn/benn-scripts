"use strict"

import commander from "commander"
import {version} from "../../package.json";
import chalk from "chalk"
import inquirer from "inquirer"
import {Builder, Framework, Language} from "./enums";

export function createProgram(): commander.Command{
    return commander
        .createCommand('bscripts-create-app')
        .version(version)
        .option("--use-npm")
        .option("--info")
        .on("--help", () => {
           console.log(chalk.magenta(
               "\nbscripts-create-command is an app generator cli tool. Follow the steps and you can startup a webapp in notime."
           ))
        })
        .parse(process.argv)
}

interface CommandOptions {
    name: string
    language: Language,
    framework: Framework
    builder: Builder
}

export async function createOptions(): Promise<CommandOptions> {
    console.log(Object.keys(Language))
    const languages = Object.keys(Language).map((item:string):string => {
        // @ts-ignore
        return Language[item]
    })
    const builders = Object.keys(Builder).map((item:string):string => {
        // @ts-ignore
        return Builder[item]
    })
    const frameworks = Object.keys(Framework).map((item:string):string => {
        // @ts-ignore
        return Framework[item]
    })
    return inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Choose a project name',
            default: 'bscripts-app'
        },
        {
            type: 'list',
            name: 'language',
            message: 'Choose the application language',
            choices: languages
        },
        {
            type: 'list',
            name: 'framework',
            message: 'Choose the application framework',
            choices: frameworks
        },
        {
            type: 'list',
            name: 'builder',
            message: 'Choose the application builder',
            choices: builders
        },
    ]);
}