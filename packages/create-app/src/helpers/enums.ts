export enum Language {
	javascript = 'Javascript',
	typescript = 'Typescript',
}

export enum Framework {
	vue = 'Vue',
	react = 'React',
	vanilla = 'Vanilla',
}

export enum Builder {
	vite = 'Vite',
	webpack = 'Webpack',
}

export const dependencies: Map<string, string[]> = new Map([
	[
		'react',
		['react', 'react-dom', '@bscripts/react-webpack', '@bscripts/react-vite'],
	],
	['vue', ['vue', '@bscripts/vue-webpack', '@bscripts/vue-vite']],
])

export const browserList = {
	production: ['>0.2%', 'not dead', 'not op_mini all'],
	development: [
		'last 1 chrome version',
		'last 1 firefox version',
		'last 1 safari version',
	],
}
