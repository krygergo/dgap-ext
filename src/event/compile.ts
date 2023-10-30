import { window, workspace } from "vscode";
import { EventMangerEmitter } from "../eventManager";
import { AlgorithmService, newAlgorithmService } from "../service/algorithm";
import { newCompileConfig } from "../util/dgapConfig";
import path from "path";
import { existsSync } from "fs";

const InitState: State = {};

interface State {
    services?: Services
}

interface Services {
    algorithmService: AlgorithmService;
}

export function newCompileEvent(eventEmitter: EventMangerEmitter) {
    let state = InitState;
    eventEmitter.onErlangStart(service => {
        state.services = {
            algorithmService: newAlgorithmService(service)
        };
    });
    eventEmitter.onErlangStop(() => {
        state = InitState;
    });
    return async function() {
        state = await compile(state);
    };
}

async function compile(state: State) {
    if (!state.services) {
        throw new Error("Unable to communicate with erlang process");
    }
    const { algorithmService } = state.services;
    const filePath = await getFilePathInWorkspace();
    const compileResponse = await algorithmService.compile(filePath);
    if (compileResponse !== "ok") {
        throw new Error(`Compile error: ${compileResponse}`);
    }
    window.showInformationMessage("Compiled successfully");
    return state;
}

async function getFilePathInWorkspace() {
    const compileConfig = await newCompileConfig();
    if (!compileConfig) {
        throw new Error("No compile configuration specified");
    }
    for (const folder of workspace.workspaceFolders!) {
        const filePath = path.join(folder.uri.fsPath, compileConfig.file);
        if (existsSync(filePath)) {
            return filePath;
        }
    }
    throw new Error(`Unable to find file ${compileConfig.file}`);
}
