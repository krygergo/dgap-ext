import { toErlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import { Service } from "./service";
import { Topology } from "./topology";

interface SimulationService {
    add(id: number): Promise<"ok" | "exists">;
    topology(id: number, topology: Topology): Promise<"ok" | "error">;
    start(id: number, module: string, fun?: string): Promise<"ok" | "error">;
    stop(id: number): Promise<"ok" | "error">;
    kill(id: number): void;
    removeLink(id: number, edge: [number, number]): void;
    reinsertLink(id: number, edge: [number, number]): void;
}

export default function(service: Service): SimulationService {
    return {
        add: async (id: number) => {
            const response = await service.call(toErlangRequest("simulation", "add", toErlangTerm("integer", id)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "exists";
        },
        topology: async (id: number, topology: Topology) => {
            const response = await service.call(toErlangRequest("simulation", "topology", toErlangTerm("integer", id), topology));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        start: async (id: number, module: string, fun?: string) => {
            if (!fun) {
                const response = await service.call(toErlangRequest("simulation", "start", toErlangTerm("integer", id), toErlangTerm("atom", module)));
                if (response.content[1].content === "ok") {
                    return "ok";
                };
                return "error";
            }
            const response = await service.call(toErlangRequest("simulation", "start", toErlangTerm("integer", id), toErlangTerm("atom", module), toErlangTerm("atom", fun)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        stop: async (id: number) => {
            const response = await service.call(toErlangRequest("simulation", "stop", toErlangTerm("integer", id)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        kill: (id: number) => {
            service.cast(toErlangRequest("simulation", "kill", toErlangTerm("integer", id)));
        },
        removeLink: (id: number, [id1, id2]: [number, number]) => {
            service.cast(toErlangRequest("simulation", "remove_link", toErlangTerm("integer", id), toErlangTerm("integer", id1), toErlangTerm("integer", id2)));
        },
        reinsertLink: (id: number, [id1, id2]: [number, number]) => {
            service.cast(toErlangRequest("simulation", "reinsert_link", toErlangTerm("integer", id), toErlangTerm("integer", id1), toErlangTerm("integer", id2)));
        }
    };
}

export {
    SimulationService
};
