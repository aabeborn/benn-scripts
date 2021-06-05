#!/usr/bin/env node
"use strict";
// import {Command} from "commander";

import {
    isNodeSupported
} from "./helpers";
import {createProgram} from "./helpers/commands"
import chalk from "chalk";
import figlet from "figlet";

async function init():Promise<void> {
    console.log(
        chalk.yellowBright(
            figlet.textSync("BSCRIPTS",{
                horizontalLayout: "controlled smushing"
            })
        )
    )
    isNodeSupported()
    // const program: Command = createProgram()
    createProgram()
}


init()