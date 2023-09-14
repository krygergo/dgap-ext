import { Socket } from "net";
import { ErlangRequest, ErlangResponse, decode, encode } from "../erlangExtTermFormat";

type Request = ErlangRequest;

type Response = ErlangResponse;

type Promises = { 
    [ref: string]: {
        resolve(value: Response | PromiseLike<Response>): void;
        reject(reason?: any): void;
    }
};

export interface DataModel {

    promises: Promises;

    socket: Socket;

    connect(port: number): Promise<void>;

    call(request: Request, timeout?: number | "infinity"): Promise<Response>;

    cast(request: Request): boolean;
}

export function createDataModel(): DataModel {
    const promises = {};
    const socket = new Socket();
    const dataModel: DataModel = { promises, socket, connect, call, cast };
    socket.on("data", data => resolveOnData(dataModel, data));
    socket.on("close", hadError => resolveOnClose(dataModel, hadError));
    socket.on("error", error => resolveOnError(dataModel, error));
    return dataModel;
}

function connect(this: DataModel, port: number, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        this.socket.connect(port, () => resolve());
        setTimeout(() => reject(`Failed to connect before timeout ${timeout}`), timeout);
    });
}

function call(this: DataModel, request: Request, timeout: number | "infinity" = 5000): Promise<Response> {
    return new Promise((resolve, reject) => {
        if (!write(this, request)) {
            reject("Failed to write data");
            return;
        }
        this.promises[request.ref()] = { resolve, reject };
        if (timeout !== "infinity") {
            setTimeout(() => {
                delete this.promises[request.ref()];
                reject(`Failed to retrieve response before timeout ${timeout}`);
            }, timeout);
        }
    });
}

function cast(this: DataModel, request: Request): boolean {
    return write(this, request);
}

function write(data: DataModel, request: Request): boolean {
    return data.socket.write(encode(request));
}

function resolveOnData(dataModel: DataModel, data: Buffer) {
    const term = decode(data) as ErlangResponse;
    const ref = term.content[0].content;
    dataModel.promises[ref].resolve(term);
    delete dataModel.promises[ref];
}

function resolveOnClose(dataModel: DataModel, hadError: boolean) {
    if (hadError) {
        return;
    }
    Object.values(dataModel.promises).forEach(promise => {
        promise.reject("closed");
    });
    dataModel.promises = {};
}

function resolveOnError(dataModel: DataModel, error: Error) {
    Object.values(dataModel.promises).forEach(promise => {
        promise.reject(error);
    });
    dataModel.promises = {};
}
