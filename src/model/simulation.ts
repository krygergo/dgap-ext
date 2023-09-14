import { Term, erlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import { DataModel } from "./data";

type Id = string | number;

export interface SimulationModel extends DataModel {
    add: typeof add;
    kill: typeof kill;
    add_ring_topology: typeof add_ring_topology;
    add_random_topology: typeof add_random_topology;
    start: typeof start;
    stop: typeof stop;
    removeLink: typeof removeLink;
    reinsertLink: typeof reinsertLink;
    readHistory: typeof readHistory;
    readLog: typeof readLog;
}

export function simulationModel(dataModel: DataModel): SimulationModel {
    return { ...dataModel, add, kill, add_ring_topology, add_random_topology, start, stop, removeLink, reinsertLink, readHistory, readLog };
}

async function add(this: SimulationModel, id: Id, module: string) {
    return (await this.call(erlangSimulationRequest("add", 2,
        idAsErlangTerm(id), 
        toErlangTerm("atom", module)))).content[1];
}

async function kill(this: SimulationModel, id: Id) {
    return (await this.call(erlangSimulationRequest("kill", 1, idAsErlangTerm(id)))).content[1];
}

async function add_ring_topology(this: SimulationModel, id: Id, size: number) {
    const topologyResponse = await this.call(erlangTopologyRequest("ring", 1, toErlangTerm("integer", size)));
    const topology = topologyResponse.content[1];
    return (await this.call(erlangSimulationRequest("add_topology", 2, idAsErlangTerm(id), topology))).content[1];
}

async function add_random_topology(this: SimulationModel, id: Id, size: number, alpha: number) {
    const topologyResponse = await this.call(erlangTopologyRequest("random", 2, toErlangTerm("integer", size), toErlangTerm("float", alpha)));
    const topology = topologyResponse.content[1];
    return (await this.call(erlangSimulationRequest("add_topology", 2, idAsErlangTerm(id), topology))).content[1];
}

async function start(this: SimulationModel, id: Id, fun: string) {
    return (await this.call(erlangSimulationRequest("start", 2, idAsErlangTerm(id), toErlangTerm("atom", fun)))).content[1];
}

async function stop(this: SimulationModel, id: Id) {
    return (await this.call(erlangSimulationRequest("stop", 1, idAsErlangTerm(id)))).content[1];
}

async function removeLink(this: SimulationModel, id: Id, id1: Id, id2: Id) {
    return (await this.call(erlangSimulationRequest("remove_link", 3, 
        idAsErlangTerm(id),
        idAsErlangTerm(id1),
        idAsErlangTerm(id2)))).content[1];
}

async function reinsertLink(this: SimulationModel, id: Id, id1: Id, id2: Id) {
    return (await this.call(erlangSimulationRequest("reinsert_link", 3, 
        idAsErlangTerm(id),
        idAsErlangTerm(id1),
        idAsErlangTerm(id2)))).content[1];
}

async function readHistory(this: SimulationModel, id: Id) {
    return (await this.call(erlangSimulationRequest("read_history", 1, idAsErlangTerm(id)), "infinity")).content[1];
}

async function readLog(this: SimulationModel) {
    return (await this.call(erlangRequest("simulation_logger", "read", 0), "infinity")).content[1];
}

function erlangSimulationRequest(fun: string, arity: number, ...args: Term[]) {
    return erlangRequest("simulation", fun, arity, ...args);
}

function erlangTopologyRequest(fun: string, arity: number, ...args: Term[]) {
    return erlangRequest("topology", fun, arity, ...args);
}

function idAsErlangTerm(id: Id) {
    switch (typeof id) {
        case "string":
            return toErlangTerm("integer", parseInt(id));
        case "number":
            return toErlangTerm("integer", id);
    }
}
