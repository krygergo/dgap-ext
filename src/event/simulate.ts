import { Uri, ViewColumn, window } from "vscode";
import { EventMangerEmitter } from "../eventManager";
import { newSimulateConfig } from "../util/dgapConfig";
import { SimulationService, newSimulationService } from "../service/simulation";
import { Topology, TopologyService, fromTopology, newTopologyService } from "../service/topology";
import { EventHandlerService, newEventHandlerService } from "../service/eventHandler";
import { readFileSync } from "fs";
import { PUBLIC_HTML_GRAPH } from "../util/path";
import { Atom, Integer, Term, Tuple } from "../util/erlangExtTermFormat";
import { getContext } from "../context";

const InitState: State = {
    nextId: 1,
};

interface State {
    nextId: number;
    services?: Services;
}

interface Services {
    simulationService: SimulationService;
    topologyService: TopologyService;
    eventHandlerService: EventHandlerService;
}

export function newSimulateEvent(eventEmitter: EventMangerEmitter) {
    let state = InitState;
    eventEmitter.onErlangStart(service => {
        state.services = {
            simulationService: newSimulationService(service),
            topologyService: newTopologyService(service),
            eventHandlerService: newEventHandlerService(service)
        };
    });
    eventEmitter.onErlangStop(() => {
        state = InitState;
    });
    return async function() {
        state = await simulate(state);
    };
}

async function simulate(state: State) {
    if (!state.services) {
        throw new Error("Unable to communicate with erlang process");
    }
    const simulateConfig = await newSimulateConfig();
    if (!simulateConfig) {
        throw new Error("No simulate configuration specified");
    }
    const id = state.nextId;
    const { simulationService, topologyService } = state.services;
    const addResponse = await simulationService.add(id);
    if (addResponse !== "ok") {
        throw new Error("Graph simulation allready exists");
    }
    let topology: Topology;
    switch (simulateConfig.topology.type) {
        case "ring":
            topology = await topologyService.ring(1, simulateConfig.topology.size);
            break;
        case "complete":
            topology = await topologyService.complete(1, simulateConfig.topology.size);
            break;
        case "random":
            topology = await topologyService.random(1, simulateConfig.topology.size, simulateConfig.topology.alpha);
            break;
    }
    const topologyResponse = await simulationService.topology(id, topology);
    if (topologyResponse !== "ok") {
        throw new Error("Unable to set topology for graph simulation");
    }
    const startResponse = await simulationService.start(id, simulateConfig.module, simulateConfig.fun);
    if (startResponse !== "ok") {
        throw new Error("Unable to start graph simulation");
    }
    const webviewPanel = await startNewGraph(id, state.services);
    webviewPanel.webview.postMessage({
        type: "topology",
        data: fromTopology(topology)
    });
    return { ...state, nextId: id + 1 };
}

async function startNewGraph(id: number, { simulationService, eventHandlerService }: Services) {
    const context = getContext();
    const extensionUri = context.extensionUri;
    const abortController = new AbortController();
    const refs: {
        message?: string;
        result?: string;
        log?: string;
    } = {};
    abortController.signal.onabort = () => {
        Object.values(refs).forEach(ref => eventHandlerService.cancel(ref));
        simulationService.kill(id);
    };
    const webviewPanel = window.createWebviewPanel("dgap", `DGAP: ${id}`, ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    webviewPanel.webview.html = readFileSync(PUBLIC_HTML_GRAPH).toString("utf8")
        .replace("graph.css", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "public", "css", "graph.css")).toString())
        .replace("graphology.umd.min.js", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "node_modules", "graphology", "dist", "graphology.umd.min.js")).toString())
        .replace("sigma.min.js", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "node_modules", "sigma", "build", "sigma.min.js")).toString())
        .replace("graph.mjs", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "out", "view", "graph.mjs")).toString());
    webviewPanel.onDidDispose(() => abortController.abort());
    webviewPanel.webview.onDidReceiveMessage(({type, data}) => {
        switch (type) {
            case "removelink":
                simulationService.removeLink(id, data as [number, number]);
                break;
            case "reinsertlink":
                simulationService.reinsertLink(id, data as [number, number]);
                break;
            default:
                break;
        }
    });
    async function messageListener() {
        while (true) {
            const message = eventHandlerService.readMessage(id);
            refs.message = message.ref;
            try {
                const messageResponse = await message.response;
                const data = messageResponse.content[1] as Tuple<[Atom, Tuple<[Integer, Integer, Term]>]>;
                webviewPanel.webview.postMessage({
                    type: "message",
                    data: [data.content[1].content[0].toString(), data.content[1].content[1].toString(), data.content[1].content[2].toString()]
                });
            } catch (error) {
                return;
            }
        }
    }
    async function resultListener() {
        while (true) {
            const result = eventHandlerService.readResult(id);
            refs.result = result.ref;
            try {
                const resultResponse = await result.response;
                const data = resultResponse.content[1] as Tuple<[Atom, Tuple<[Integer, Term]>]>;
                webviewPanel.webview.postMessage({
                    type: "result",
                    data: [data.content[1].content[0].toString(), data.content[1].content[1].toString(),]
                });
            } catch (error) {
                return;
            }
        }
    }
    async function logListener() {
        while (true) {
            const log = eventHandlerService.readLog(id);
            refs.log = log.ref;
            try {
                const logResponse = await log.response;
                const data = logResponse.content[1] as Tuple<[Atom, Tuple<[Integer, Term]>]>;
                webviewPanel.webview.postMessage({
                    type: "log",
                    data: [data.content[1].content[0].toString(), data.content[1].content[1].toString(),]
                });
            } catch (error) {
                return;
            }
        }
    }
    messageListener();
    resultListener();
    logListener();
    return webviewPanel;
}
