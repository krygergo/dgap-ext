import * as vscode from 'vscode';
import commands from "./commands";


export function activate(context: vscode.ExtensionContext) {
	commands(context);
}

export function deactivate() {
	//TODO
}
