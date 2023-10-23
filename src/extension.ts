import { ExtensionContext, commands } from 'vscode';
import Console from './console';

export function activate(context: ExtensionContext) {
	const console = Console(context);
	const consoleDisposable = commands.registerCommand("dgap.console", () => {
		console.start();
	});
	context.subscriptions.push(consoleDisposable);
}

export function deactivate() {
	
}
