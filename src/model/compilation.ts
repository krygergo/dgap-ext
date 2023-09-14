import { Term, erlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import { DataModel } from "./data";

interface CompilationModel extends DataModel {
    compile: typeof compile;
    algorithms: typeof algorithms;
}

export function compilationModel(dataModel: DataModel): CompilationModel {
    return { ...dataModel, compile, algorithms };
}

async function compile(this: CompilationModel, file: string) {
    return (await this.call(erlangCompilationRequest("compile", 1, toErlangTerm("string", file)))).content[1];
}

async function algorithms(this: CompilationModel) {
    return (await this.call(erlangCompilationRequest("algorithms", 0))).content[1];
}

function erlangCompilationRequest(fun: string, arity: number, ...args: Term[]) {
    return erlangRequest("compilation", fun, arity, ...args);
}
