import { toErlangRequest, toErlangTerm } from "../util/erlangExtTermFormat";
import { ErlangService } from "./erlang";
import { Topology } from "./topology";

export type SimulationService = ReturnType<typeof newSimulationService>;

export function newSimulationService(erlangService: ErlangService) {
    return {
        add: async function(id: number) {
            const response = await erlangService.call(toErlangRequest("simulation", "add", toErlangTerm("integer", id)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "exists";
        },
        topology: async function(id: number, topology: Topology) {
            const response = await erlangService.call(toErlangRequest("simulation", "topology", toErlangTerm("integer", id), topology));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        start: async function(id: number, module: string, fun: string) {
            const response = await erlangService.call(toErlangRequest("simulation", "start", toErlangTerm("integer", id), toErlangTerm("atom", module), toErlangTerm("atom", fun)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        stop: async function(id: number) {
            const response = await erlangService.call(toErlangRequest("simulation", "stop", toErlangTerm("integer", id)));
            if (response.content[1].content === "ok") {
                return "ok";
            };
            return "error";
        },
        kill: function(id: number) {
            erlangService.cast(toErlangRequest("simulation", "kill", toErlangTerm("integer", id)));
        },
        removeLink: function(id: number, [id1, id2]: [number, number]) {
            erlangService.cast(toErlangRequest("simulation", "remove_link", toErlangTerm("integer", id), toErlangTerm("integer", id1), toErlangTerm("integer", id2)));
        },
        reinsertLink: function(id: number, [id1, id2]: [number, number]) {
            erlangService.cast(toErlangRequest("simulation", "reinsert_link", toErlangTerm("integer", id), toErlangTerm("integer", id1), toErlangTerm("integer", id2)));
        }
    };
}