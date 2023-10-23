import { EventEmitter, Pseudoterminal, window } from "vscode";

interface Terminal {
    write(data: string): void;
    writeLine(data: string): void;
    newLine(): void;
    show(): void;
    onOpen(listener: () => void): void;
    onClose(listener: () => void): void;
    onInput(listener: (data: string) => void): void;
}

export default function (): Terminal {
    let openListener = () => {};
    let closeListener = () => {};
    let inputListener = (_data: string) => {};
    const writeEmitter = new EventEmitter<string>();
    const name = "DGAP";
    const pty: Pseudoterminal = {
        onDidWrite: writeEmitter.event,
        open: () => openListener(),
        close: () => closeListener(),
        handleInput: (data: string) => inputListener(data)
    };
    const terminal = window.createTerminal({ name, pty });
    return {
        write(data){
            writeEmitter.fire(data);
        },
        writeLine(data) {
            writeEmitter.fire(`${data}\r\n> `);
        },
        newLine() {
            writeEmitter.fire("\r\n> ");
        },
        show() {
            terminal.show();
        },
        onOpen(listener) {
            openListener = listener;
        },
        onClose(listener) {
            closeListener = listener;
        },
        onInput(listener) {
            inputListener = listener;
        }
    };
}

export {
    Terminal
};
