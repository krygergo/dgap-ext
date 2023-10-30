import { Integer, String, List, Tuple, toErlangRequest, toErlangTerm } from "../util/erlangExtTermFormat";
import { ErlangService } from "./erlang";

export type TopologyService = ReturnType<typeof newTopologyService>;

export type Topology = List<Tuple<[Integer, List<Integer[]> | String]>[]>;

export function fromTopology(topology: Topology): [number, number[]][] {
    return topology.content.map(vertex => {
        const [vertexId, vertexEdges] = vertex.content;
        const id = vertexId.content;
        const edges = vertexEdges.type === "list" 
            ? vertexEdges.content.map(vertexEdge => vertexEdge.content) 
            : [...vertexEdges.content].map(char => char.charCodeAt(0));
        return [id, edges];
    });
}

export function newTopologyService(erlangService: ErlangService) {
    return {
        complete: async function(from: number, to: number) {
            const response = await erlangService.call(toErlangRequest("topology", "random", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)]),
                toErlangTerm("float", 1.0)));
            return response.content[1] as Topology;
        },
        random: async function(from: number, to: number, alpha: number) {
            const response = await erlangService.call(toErlangRequest("topology", "random", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)]),
                toErlangTerm("float", alpha)));
            return response.content[1] as Topology;
        },
        ring: async function(from: number, to: number) {
            const response = await erlangService.call(toErlangRequest("topology", "ring", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)])));
            return response.content[1] as Topology;
        }
    };
}