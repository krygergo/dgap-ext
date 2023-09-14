import * as vscode from 'vscode';
import { TerminalView, createTerminalView } from './view/terminal';

const EXT_COMMANDS = [
    { id: "dgap.terminal", callback: terminalCallback }
];

interface Command {
    terminalView: TerminalView;
}

export function createCommand(extensionContext: vscode.ExtensionContext) {
    const terminalView = createTerminalView();
    const command: Command = { terminalView };
    EXT_COMMANDS.forEach(extCommand => {
        const disposable = vscode.commands.registerCommand(extCommand.id, extCommand.callback, command);
        extensionContext.subscriptions.push(disposable);
    });
}

function terminalCallback(this: Command) {
    this.terminalView.start();
}
