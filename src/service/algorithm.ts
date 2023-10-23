import { Atom, Tuple, toErlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import Service from "./service";

interface AlgorithmService {
    compile(file: string): Promise<string>;
}

export default function(service: ReturnType<typeof Service>): AlgorithmService {
    return {
        compile: async (file: string) => {
            const response = await service.call(toErlangRequest("algorithm", "compile", toErlangTerm("string", file)));
            if (response.content[1].content === "ok") {
                return "ok";
            }
            const error = response.content[1] as Tuple<[Atom, Atom]>;
            return error.toString();     
        }
    };
}

export {
    AlgorithmService
};
