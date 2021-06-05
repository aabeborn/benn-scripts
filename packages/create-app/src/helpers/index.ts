"use strict"
import chalk from "chalk";

const NODE_LAST_SUPPORTED_VERSION = 10;

export function isNodeSupported():void {
    const nodeVersion = process.versions.node;
    const major : number = +nodeVersion.split('.')[0]
    if(major < NODE_LAST_SUPPORTED_VERSION) {
        console.error(chalk.red(
            `You are running an overage Node version (${nodeVersion}).\nPlease update it at least major version ${NODE_LAST_SUPPORTED_VERSION}.`
        ))
        process.exit(1)
    }
}