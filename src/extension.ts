import * as vscode from 'vscode';
import { createCommand } from './command';

export function activate(extensionContext: vscode.ExtensionContext) {
	createCommand(extensionContext);
}

export function deactivate() {
	
}
