import { ExtensionContext, ViewColumn, window } from "vscode";
import ErlangProcess from "./erlangProcess";
import Terminal, { Terminal as ITerminal } from "./terminal";
import Service, { Service as IService } from "./service/service";
import Input from "./handler/input";
import Command from "./handler/command";

function start(service: IService, terminal: ITerminal, extensionContext: ExtensionContext) {
    const input = Input(terminal);
    terminal.onInput(input.handler);
    const command = Command(service, extensionContext);
    input.onCommand(command.handler);
    command.onResponse(response => terminal.writeLine(response));
    terminal.newLine();
}

interface ConsoleInstance {
    show(): void;
    onClose(listener: () => void): void;
}

function ConsoleInstance(extensionContext: ExtensionContext): ConsoleInstance {
    let closeListener: () => void;
    const closeHandler = () => {
        erlangProcess.close();
        closeListener();
    };
    const erlangProcess = ErlangProcess();
    erlangProcess.onConnect(socket => start(Service(socket), terminal, extensionContext));
    const terminal = Terminal();
    terminal.onOpen(() => terminal.write("\x1b[1mWelcome To Distributed Graph Algorithm Playground\x1b[22m\r\n"));
    terminal.onClose(closeHandler);
    return {
        show() {
            terminal.show();
        },
        onClose(listener) {
            closeListener = listener;
        }
    };
}

interface Console {
    start(): void;
}

export default function(extensionContext: ExtensionContext): Console {
    let instance: ConsoleInstance | null = null;
    return {
        start() {
            if (!instance) {
                instance = ConsoleInstance(extensionContext);
                instance.onClose(() => instance = null);
            }
            instance.show();
        }
    };
}
