import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";
import { DataModel, createDataModel } from "../model/data";
import { AddressInfo, Server, createServer } from "net";
import { DGAP_BIN_EXEC } from "../path";
import { compilationModel } from "../model/compilation";
import { simulationModel } from "../model/simulation";

export interface TerminalView {
    writeEmitter: vscode.EventEmitter<string>;
    terminal?: Terminal;
    start(): void;
    stop(): void;
}

interface Terminal extends vscode.Terminal {
    dgapProcess: ChildProcess;
    dataModel: DataModel;
    cursor: number;
    data: TerminalData;
    write(data: string): void;
}

interface TerminalData {
    current: string[];
}

export function createTerminalView(): TerminalView {
    const writeEmitter = new vscode.EventEmitter<string>();
    return { writeEmitter, start, stop };
}

async function start(this: TerminalView) {
    if (!this.terminal) {
        this.terminal = await createTerminal(this);
    } else {
        this.terminal.show();
    }
}

function stop(this: TerminalView) {
    this.terminal?.dgapProcess.kill();
    delete this.terminal;
}

async function createTerminal(terminalView: TerminalView) {
    const terminalProperties = createTerminalProperties();
    const name = "DGAP";
    const pty: vscode.Pseudoterminal = {
        onDidWrite: terminalView.writeEmitter.event,
        open: () => onTerminalOpen(terminalView),
        close: () => terminalView.stop(),
        handleInput: data => onTerminalInput(terminalView, data)
    };
    const terminal = vscode.window.createTerminal({ name, pty });
    terminal.show();
    const write = (data: string) => terminalView.writeEmitter.fire(data);
    return { ...terminal, ...(await terminalProperties), write};
}

async function createTerminalProperties(timeout = 5000): Promise<Omit<Terminal, keyof vscode.Terminal | "write">> {
    return new Promise(async (resolve, reject) => {
        setTimeout(() => reject(new Error(`Failed to create terminal properties before timeout ${timeout}`)), timeout);
        const initServer: Server = await new Promise(resolve => {
            const server = createServer().listen(() => resolve(server));
        });
        const initServerAddress = initServer.address() as AddressInfo;
        const dgapProcess = spawn(DGAP_BIN_EXEC, ["ext", "start", `vsc-ext ${initServerAddress.port}`]);
        dgapProcess.stdout.on("data", data => console.log(data.toString("utf8")));
        const port: number = await new Promise(resolve => 
            initServer.once("connection", socket => 
                socket.once("data", data => 
                    resolve(parseInt(data.toString("utf8"))))));
        const dataModel = createDataModel();
        await dataModel.connect(port);
        const cursor = 0;
        const data = createTerminalData();
        resolve({ dgapProcess, dataModel, cursor, data });
    });
}

function createTerminalData() {
    const current: string[] = [];
    return { current };
}

async function onTerminalOpen(terminalView: TerminalView, writeIndex = 0) {
    if (terminalView.terminal) {
        return terminalView.writeEmitter.fire("\x1b[2K\rWelcome To Distributed Graph Algorithm Playgrund\r\n\n> ");
    }
    const loading = "loading....";
    if (writeIndex === loading.length) {
        terminalView.writeEmitter.fire("\x1b[2K\r");
        return onTerminalOpen(terminalView, 0);
    }
    const writeChar = [...loading][writeIndex];
    await new Promise(resolve => setTimeout(() => {
        terminalView.writeEmitter.fire(writeChar);
        resolve({});
    }, 100));
    onTerminalOpen(terminalView, writeIndex + 1);
}

function onTerminalInput(terminalView: TerminalView, data: string) {
    if (!terminalView.terminal) {
        return;
    }
    handleInput(terminalView.terminal, data);
}

function handleInput(terminal: Terminal, data: string) {
    switch (data) {
        case "\r": /* Enter */
            enterInput(terminal);
            break;
        case "\x1b[A": /* Arrow Up */
            arrowUpInput(terminal);
            break;
        case "\x1b[B": /* Arrow Down */
            arrowDownInput(terminal);
            break;
        case "\x1b[C": /* Arrow Right */
            arrowRightInput(terminal);
            break;
        case "\x1b[D": /* Arrow Left */
            arrowLeftInput(terminal);
            break;
        case "\x7F": /* Backspace */
            backspaceInput(terminal);
            break;
        case "\x1b[3~": /* Delete */
            deleteInput(terminal);
            break;
        default:
            if (data.length === 1) {
                const charCode = data.charCodeAt(0);
                if (32 <= charCode && charCode <= 126) {
                    asciiPrintableInput(data, terminal);
                }
                break;
            }
            textInput(data, terminal);
    }
}

async function enterInput(terminal: Terminal) {
    const response = await handleOperation(terminal);
    terminal.write(`\r\n${response.toString()}\r\n> `);
    terminal.data.current = [];
    terminal.cursor = 0;
}

function arrowUpInput(terminal: Terminal) {
    
}

function arrowDownInput(terminal: Terminal) {

}

function arrowRightInput(terminal: Terminal) {
    if (terminal.cursor === terminal.data.current.length) {
        return;
    }
    terminal.cursor += 1;
    terminal.write("\x1b[C");
}

function arrowLeftInput(terminal: Terminal) {
    if (terminal.cursor === 0) {
        return;
    }
    terminal.cursor -= 1;
    terminal.write("\x1b[D");
}

function backspaceInput(terminal: Terminal) {
    if (!terminal.cursor) {
        return;
    }
    terminal.write(`\x1b[1D\x1b[P`);
    terminal.cursor -= 1;
    terminal.data.current.splice(terminal.cursor, 1);
}

function deleteInput(terminal: Terminal) {
    if (!terminal.cursor || terminal.cursor === terminal.data.current.length) {
        return;
    }
    terminal.write("\x1b[C\x1b[1D\x1b[P");
    terminal.data.current.splice(terminal.cursor, 1);
}

function asciiPrintableInput(data: string, terminal: Terminal) {
    if (data === "\t") {
        return;
    }
    if (terminal.cursor === terminal.data.current.length) {
        terminal.write(data);
        terminal.data.current.push(data);
        terminal.cursor += 1;
        return;
    }
    terminal.write(`\x1b[s${[data, ...terminal.data.current.slice(terminal.cursor)].join("")} \x1b[u\x1b[C`);
    terminal.data.current.splice(terminal.cursor, 0, data);
    terminal.cursor += 1;
}

function textInput(data: string, terminal: Terminal) {
    terminal.write(data);
    terminal.data.current = [...terminal.data.current, ...data];
    terminal.cursor += data.length;
}

function handleOperation(terminal: Terminal) {
    const [operation, ...rest] = terminal.data.current.join("").split(" ");
    switch (operation) {
        case "compile":
            return compileOperation(rest, terminal);
        case "algorithms":
            return algorithmsOperation(terminal);
        case "add":
            return addOperation(rest, terminal);
        case "kill":
            return killOperation(rest, terminal);
        case "topology":
            return topologyOperation(rest, terminal);
        case "start":
            return startOperation(rest, terminal);
        case "stop":
            return stopOperation(rest, terminal);
        case "removelink":
            return removelinkOperation(rest, terminal);
        case "reinsertlink":
            return reinsertlinkOperation(rest, terminal);
        case "display":
            return displayOperation(rest, terminal);
        case "help":
            return helpOperation();
        default:
            return "Unknown command! Type help for a list of supported operations";
    }
}

function compileOperation(args: string[], terminal: Terminal) {
    if (!args.length) {
        return "  compile <filename>";
    }
    return compilationModel(terminal.dataModel).compile(args[0]);
}

function algorithmsOperation(terminal: Terminal) {
    return compilationModel(terminal.dataModel).algorithms();
}

function addOperation(args: string[], terminal: Terminal) {
    if (args.length < 2) {
        return "  add <id> <algorithm>";
    }
    return simulationModel(terminal.dataModel).add(args[0], args[1]);
}

function killOperation(args: string[], terminal: Terminal) {
    if (!args.length) {
        return "  kill <id>";
    }
    return simulationModel(terminal.dataModel).kill(args[0]);
}

function topologyOperation(args: string[], terminal: Terminal) {
    const topologyOperationString = `  topology ring <id> <size>\r
  topology complete <id> <size>\r
  topology random <id> <size> <alpha>`;
    if (!args.length) {
        return topologyOperationString;
    }
    const [topology, ...rest] = args;
    switch (topology) {
        case "ring":
            return ringTopologyOperation(rest, terminal);
        case "complete":
            return completeTopologyOperation(rest, terminal);
        case "random":
            return randomTopologyOperation(rest, terminal);
        default:
            return topologyOperationString;
    }
}

function ringTopologyOperation(args: string[], terminal: Terminal) {
    if (args.length < 2) {
        return `  topology ring <id> <size>`;
    }
    return simulationModel(terminal.dataModel).add_ring_topology(args[0], parseInt(args[1]));
}

function completeTopologyOperation(args: string[], terminal: Terminal) {
    if (args.length < 2) {
        return `  topology complete <id> <size>`;
    }
    return simulationModel(terminal.dataModel).add_random_topology(args[0], parseInt(args[1]), 1.0);
}

function randomTopologyOperation(args: string[], terminal: Terminal) {
    if (args.length < 3) {
        return `  topology random <id> <size> <alpha>`;
    }
    return simulationModel(terminal.dataModel).add_random_topology(args[0], parseInt(args[1]), parseFloat(args[2]));
}

function startOperation(args: string[], terminal: Terminal) {
    if (args.length < 2) {
        return `  start <id> <function>`;
    }
    return simulationModel(terminal.dataModel).start(args[0], args[1]);
}

function stopOperation(args: string[], terminal: Terminal) {
    if (!args.length) {
        return `  stop <id>`;
    }
    return simulationModel(terminal.dataModel).stop(args[0]);
}

function removelinkOperation(args: string[], terminal: Terminal) {
    if (args.length < 3) {
        return "  removelink <id> <id1> <id2>";
    }
    return simulationModel(terminal.dataModel).removeLink(args[0], args[1], args[2]);
}

function reinsertlinkOperation(args: string[], terminal: Terminal) {
    if (args.length < 3) {
        return "  reinsertlink <id> <id1> <id2>";
    }
    return simulationModel(terminal.dataModel).reinsertLink(args[0], args[1], args[2]);
}

function displayOperation(args: string[], terminal: Terminal) {
    const displayOperationString = `  display log <id>\r
  display communication <id>`;
    if (args.length < 2) {
        return displayOperationString;
    }
    const [display, ...rest] = args;
    switch (display) {
        case "log":
            return displayLogOperation(rest, terminal);
        case "communication":
            return displayCommunicationOperation(rest, terminal);
        default:
            return displayOperationString;
    }
}

function displayLogOperation(args: string[], terminal: Terminal) {
    if (!args.length) {
        return "  display log <id>";
    }

    return "ok";
}

function displayCommunicationOperation(args: string[], terminal: Terminal) {
    if (!args.length) {
        return "  display communication <id>";
    }
    const webViewPanel = vscode.window.createWebviewPanel("dgap", "Display", vscode.ViewColumn.Active);
    displayCommunicationTask(args[0], webViewPanel, terminal);
    return "ok";
}

async function displayCommunicationTask(id: string, webViewPanel: vscode.WebviewPanel, terminal: Terminal, history: string[] = []) {
    const newHistory = await simulationModel(terminal.dataModel).readHistory(id);
    history.push(newHistory.toString());
    webViewPanel.webview.html = displayCommunicationContent(history);
    displayCommunicationTask(id, webViewPanel, terminal, history);
}

function displayCommunicationContent(history: string[]) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <ul>
        ${history.map(story => `<li>${story}</li>`).join("")}
    </ul>
</body>
</html>`;
}

function helpOperation() {
    return `OPERATIONS\r
\r
    compile             compile a .erl file into an algorithm\r
    algorithms          return a list of algorithms\r
    add                 add a new graph simulation\r
    kill                kill a graph simulation\r
    topology            add a topology for a graph\r
    start               start a graph\r
    stop                stop a graph\r
    removelink          remove a link between two vertices\r
    reinsertlink        reinsert a removed link betweeen two vertices\r
    display             logging and communication\r
\r
Some operations require arguments, if a operation requires an argument\r
it is showcased by '<argument>' and should be run without '<' and '>'.`;
}
