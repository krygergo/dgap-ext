import { Terminal } from "../terminal";

interface Input {
    onCommand(listener: (command: string) => void): void;
    handler(data: string): void;
}

export default function({ write }: Terminal): Input {
    let commandListener = (_command: string) => {};
    let input: string[] = [];
    let cursor = 0;
    return {
        onCommand(listener) {
            commandListener = listener;
        },
        handler(data) {
            switch (data) {
                case "\r": {
                    write("\r\n");
                    const command = input.join("");
                    commandListener(command);
                    input = [];
                    cursor = 0;
                    break;
                }
                case "\t": // Tab
                    break;
                case "\x03": // Ctrl-C
                    break;
                case "\x1b[A": // Arrow Up
                    break;
                case "\x1b[B": // Arrow Down
                    break;
                case "\x1b[C": { // Arrow Right
                    if (cursor < input.length) {
                        cursor++;
                        write("\x1b[C");
                    }
                    break;
                }
                case "\x1b[D": { // Arrow Left
                    if (cursor) {
                        cursor--;
                        write("\x1b[D");
                    }
                    break;
                }
                case "\x7F": { // Backspace
                    if (cursor) {
                        cursor--;
                        input.splice(cursor, 1);
                        write(`\x1b[D\x1b[K\x1b7${input.slice(cursor).join("")}\x1b8`);
                    }
                    break;
                }
                case "\x1b[3~": { // Delete
                    if (input.length) {
                        input.splice(cursor, 1);
                        write(`\x1b[K\x1b7${input.slice(cursor).join("")}\x1b8`);
                    }
                    break;
                }
                default: {
                    input.splice(cursor, 0, data);
                    write(`\x1b[K${input.slice(cursor).join("")}`);
                    cursor += data.length;
                    break;
                }
            }
        }
    };
}
