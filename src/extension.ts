import { ExtensionContext } from 'vscode';
import { newApplication } from './application';
import { setContext } from './context';

export function activate(context: ExtensionContext) {
	setContext(context);
	newApplication().activate();
}

export function deactivate() {
	
}
