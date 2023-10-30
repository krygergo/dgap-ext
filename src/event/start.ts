import { spawn } from "child_process";
import { EventMangerEmitter } from "../eventManager";
import { AddressInfo, createServer } from "net";
import { DGAP_BIN_EXEC } from "../util/path";
import { Atom, Integer, Tuple, decode } from "../util/erlangExtTermFormat";
import { Socket } from "net";
import { window } from "vscode";
import { newErlangService } from "../service/erlang";

const InitState: State = {
    active: false
};

interface State {
    active: boolean
}

export function newStartEvent(eventEmitter: EventMangerEmitter) {
    let state = InitState;
    return function() {
        if (!state.active) {
            state = start(eventEmitter, state);
        }
    };
}

function start(eventEmitter: EventMangerEmitter, state: State): State {
    const server = createServer().listen(() => {
        server.once("connection", socket => {
            socket.once("data", data => {
                const erlangPort = decode(data) as Tuple<[Atom, Integer]>;
                const port = erlangPort.content[1].content;
                erlangSocket.connect(port, () => {
                    eventEmitter.emitErlangStart(newErlangService(erlangSocket));
                    state.active = true;
                    window.showInformationMessage("Erlang process ready");
                });
            });
            server.once("close", socket.end);
        });
    });
    const address = server.address() as AddressInfo;
    const erlangProcess = spawn(DGAP_BIN_EXEC, ["ext", "start", `vsc-ext ${address.port}`]);
    erlangProcess.stdout.on("data", data => console.log(data.toString("utf8")));
    const erlangSocket = new Socket();
    erlangProcess.once("close", () => {
        server.close();
        erlangSocket.end();
        window.showInformationMessage("Erlang process closed");
        state.active = false;
    });
    eventEmitter.onErlangStop(() => erlangProcess.kill());
    return state;
}
