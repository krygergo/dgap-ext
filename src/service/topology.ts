import { Integer, String, List, Tuple, toErlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import { Service } from "./service";

type Topology = List<Tuple<[Integer, List<Integer[]> | String]>[]>;

function fromTopology(topology: Topology): [number, number[]][] {
    return topology.content.map(vertex => {
        const [vertexId, vertexEdges] = vertex.content;
        const id = vertexId.content;
        const edges = vertexEdges.type === "list" 
            ? vertexEdges.content.map(vertexEdge => vertexEdge.content) 
            : [...vertexEdges.content].map(char => char.charCodeAt(0));
        return [id, edges];
    });
}

interface TopologyService {
    complete(from: number, to: number): Promise<Topology>;
    random(from: number, to: number, alpha: number): Promise<Topology>;
    ring(from: number, to: number): Promise<Topology>;
}

export default function(service: Service): TopologyService {
    return {
        complete: async (from, to) => {
            const response = await service.call(toErlangRequest("topology", "random", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)]),
                toErlangTerm("float", 1.0)));
            return response.content[1] as Topology;
        },
        random: async (from, to, alpha) => {
            const response = await service.call(toErlangRequest("topology", "random", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)]),
                toErlangTerm("float", alpha)));
            return response.content[1] as Topology;
        },
        ring: async (from, to) => {
            const response = await service.call(toErlangRequest("topology", "ring", 
                toErlangTerm("tuple", [toErlangTerm("integer", from), toErlangTerm("integer", to)])));
            return response.content[1] as Topology;
        }
    };
}

export {
    Topology,
    fromTopology,
    TopologyService
};
