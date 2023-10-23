import { ExtensionContext, Uri } from "vscode";
import { Service } from "../service/service";
import { parseArgs } from "util";
import AlgorithmService from "../service/algorithm";
import { some } from "../maybe";
import SimulationService from "../service/simulation";
import GraphWebview, { GraphWebview as IGraphWebview } from "../webview/graph";
import ErlangEventHandler from "./erlangEvent";
import EventHandlerService from "../service/eventHandler";
import TopologyService, { Topology, fromTopology } from "../service/topology";

const algorithmOptions = {
    file: {
        type: "string",
        short: "f"
    }
} as const;

function algorithmOperation(args: string[], service: Service) {
    const algorithmService = AlgorithmService(service);
    const options = algorithmOptions;
    const { values: { file } } = parseArgs({ args, options });
    return some(file, "No file given")
        .map(file => algorithmService.compile(file));
}

async function simulationOperation(service: Service, extensionUri: Uri, state: State) {
    const simulationService = SimulationService(service);
    const eventHandlerService = EventHandlerService(service);
    const id = state.nextId;
    const add = await simulationService.add(id);
    if (add !== "ok") {
        return add;
    }
    const erlangEventHandler = ErlangEventHandler(id, eventHandlerService);
    const graphWebview = GraphWebview(extensionUri, `DGAP: ${id}`);
    graphWebview.onErlangEvent(erlangEventHandler);
    graphWebview.onMessage(({ type, data }) => {
        switch (type) {
            case "removelink":
                simulationService.removeLink(id, data as [number, number]);
                break;
            case "reinsertlink":
                simulationService.reinsertLink(id, data as [number, number]);
        }
    });
    graphWebview.onDispose(() => delete state.graphs[id]);
    const size = 0;
    state.graphs[id] = { size, graphWebview };
    state.currentId = id;
    state.nextId++;
    return "ok";
}

function graphOptions(state: State) {
    const id = state.currentId;
    return {
        id: {
            type: "string",
            default: `${id}`
        },
        module: {
            type: "string",
            short: "m",
            default: id ? `${state.graphs[id].module}` : undefined
        },
        fun: {
            type: "string",
            short: "f",
            default: id ? `${state.graphs[id].fun}` : undefined
        },
        topology: {
            type: "string",
            short: "t",
            default: undefined
        },
        size: {
            type: "string",
            short: "s",
            default: "10"
        },
        alpha: {
            type: "string",
            short: "a",
            default: "0.0"
        },
        stop: {
            type: "boolean",
            default: false
        }
    } as const;
}

function graphOperation(args: string[], service: Service, state: State) {
    const simulationService = SimulationService(service);
    const topologyService = TopologyService(service);
    const options = graphOptions(state);
    const { values: { id, module, fun, topology, size, alpha, stop } } = parseArgs({ args, options });
    return some(id, "No id found")
        .map(id => parseInt(id))
        .bind(id => some(state.graphs[id], "No graph found").map(graph => ({ id, graph })))
        .bind(({ id, graph }) => {
            if (stop) {
                return some(simulationService.stop(id));
            }
            return some(module, "No module found").bind(module => some(fun, "No fun found").map(fun => ({ ...graph, module, fun })))
                .map(async graph => {
                    const maybeTopology = await some(topology, "No topology found").bind(topology => some(size, "No size found").map(size => ({ topology, size: parseInt(size) })))
                        .bindAsync(async ({ topology, size }) => {
                            switch (topology) {
                                case "complete": {
                                    const topology = topologyService.complete(graph.size + 1, graph.size + size);
                                    graph.size += size;
                                    return some(await topology);
                                }
                                case "random": {
                                    return some(alpha).mapAsync(alpha => {
                                        const topology = topologyService.random(graph.size + 1, graph.size + size, parseFloat(alpha));
                                        graph.size += size;
                                        return topology;
                                    });
                                }
                                case "ring": {
                                    const topology = topologyService.ring(graph.size + 1, graph.size + size);
                                    graph.size += size;
                                    return some(await topology);
                                }
                                default:
                                    return some<Topology>();
                            }
                        });
                    await maybeTopology.mapAsync(async topology => {
                        await simulationService.topology(id, topology);
                        graph.graphWebview.postMessage({
                            type: "topology",
                            data: fromTopology(topology)
                        });
                    });
                    state.graphs[id] = graph;
                    return simulationService.start(id, graph.module, graph.fun);
                });
        });
}

interface Command {
    onResponse(listener: (response: string) => void): void;
    handler(command: string): void;
}

interface State {
    currentId?: number;
    nextId: number;
    graphs: {
        [key: number]: {
            module?: string;
            fun?: string;
            size: number;
            graphWebview: IGraphWebview;
        }
    }
}

export default function(service: Service, extensionContext: ExtensionContext): Command {
    let responseListener = (_response: string) => {};
    const state: State = {
        nextId: 1,
        graphs: {}
    };
    return {
        onResponse(listener) {
            responseListener = listener;
        },
        async handler(command) {
            const [operation, ...args] = command.split(" ");
            try {
                switch (operation) {
                    case "algorithm": 
                        algorithmOperation(args, service)
                            .map(async response => responseListener(await response));
                        break;
                    case "simulation":
                        const response = simulationOperation(service, extensionContext.extensionUri, state);
                        responseListener(await response);
                        break;
                    case "graph":
                        graphOperation(args, service, state)
                            .map(async response => responseListener(await response));
                        break;
                    default:
                        throw new Error("Unknown Command");
                }
            } catch(error) {
                if (error instanceof Error) {
                    responseListener(`Error: ${error.message}`);
                } else {
                    responseListener("Error: Unknown Error");
                }
            }
        },
    };
}
