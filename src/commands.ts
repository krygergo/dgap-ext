import * as vscode from 'vscode';

type Command = {
    id: string,
    callback: (...args: any[]) => any
};

export default function (context: vscode.ExtensionContext) {
    COMMANDS.forEach(command => context.subscriptions.push(vscode.commands.registerCommand(command.id, command.callback)));
}

function start() {
    vscode.window.showInformationMessage("Started");
}

const COMMANDS: Command[] = [
    { id: "dgap.start", callback: start }
];
