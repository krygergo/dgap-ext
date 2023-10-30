import { Atom, Tuple, toErlangRequest, toErlangTerm } from "../util/erlangExtTermFormat";
import { ErlangService } from "./erlang";

export type AlgorithmService = ReturnType<typeof newAlgorithmService>;

export function newAlgorithmService(erlangService: ErlangService) {
    return {
        compile: async function(file: string) {
            const response = await erlangService.call(toErlangRequest("algorithm", "compile", toErlangTerm("string", file)));
            if (response.content[1].content === "ok") {
                return "ok";
            }
            const error = response.content[1] as Tuple<[Atom, Atom]>;
            return error.toString();     
        }
    };
}
