import { spawn } from "child_process";
import { AddressInfo, Socket, createServer } from "net";
import { Atom, Integer, Tuple, decode } from "./erlangExtTermFormat";
import { DGAP_BIN_EXEC } from "./path";

interface ErlangProcess {
    onConnect(listener: (socket: Socket) => void): void;
    close(): void;
}

export default function (): ErlangProcess {
    let port: number | null = null;
    let connectListener: ((socket: Socket) => void) | null = null;
    const invoke = () => {
        const socket = new Socket();
        socket.connect(port!, () => {
            connectListener!(socket);
        });
    };
    const server = createServer().listen(() => {
        server.once("connection", socket => {
            socket.once("data", data => {
                const erlangPort = decode(data) as Tuple<[Atom, Integer]>;
                port = erlangPort.content[1].content;
                if (connectListener) {
                    invoke();
                }
            });
        });
    });
    const address = server.address() as AddressInfo;
    const process = spawn(DGAP_BIN_EXEC, ["ext", "start", `vsc-ext ${address.port}`]);
    process.stdout.on("data", (data: Buffer) => console.log(data.toString()));
    return {
        onConnect(listener: (socket: Socket) => void): void {
            connectListener = listener;
            if (port) {
                invoke();
            }
        },
        close(): void {
            process.kill();
        }
    };
}

export {
    ErlangProcess
};
