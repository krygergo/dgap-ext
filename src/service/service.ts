import { Socket } from "net";
import { ErlangRequest, ErlangResponse, decode, encode } from "../erlangExtTermFormat";

type Ref = string;
type ResponsePromises = {
    resolve(value: ErlangResponse | PromiseLike<ErlangResponse>): void;
    reject(reason?: any): void;
};

interface Service {
    call: (erlangRequest: ErlangRequest, timeout?: number | "infinity") => Promise<ErlangResponse>;
    cast: (erlangRequest: ErlangRequest) => boolean;
    cancel: (ref: Ref) => void;
}

export default function (socket: Socket): Service {
    const promises: { [key: Ref]: ResponsePromises } = {};
    socket.on("data", (data: Buffer) => {
        const buffer: number[] = [];
        const { buffers } = data.reduce((acc, byte) => {
            if (byte === 131 && acc.buffer.length) {
                acc.buffer = [];
                acc.buffers.push(acc.buffer);
            }
            acc.buffer.push(byte);
            return acc;
        }, { buffer, buffers: [buffer] });
        buffers.forEach(data => {
            const response = decode(Buffer.from(data)) as ErlangResponse;
            const ref = response.content[0].content;
            if (ref in promises) {
                const { resolve } = promises[ref];
                resolve(response);
                delete promises[ref];
            }
        });
    });
    return {
        call: function(erlangRequest: ErlangRequest, timeout: number | "infinity" = 5000) {
            return new Promise<ErlangResponse>((resolve, reject) => {
                if (!socket.write(encode(erlangRequest))) {
                    return reject("Call write error");
                }
                promises[erlangRequest.ref()] = { resolve, reject };
                if (timeout !== "infinity") {
                    setTimeout(() => {
                        reject(`Call timeout error`);
                        delete promises[erlangRequest.ref()];
                    }, timeout);
                }
            });
        },
        cast: function(erlangRequest: ErlangRequest) {
            return socket.write(encode(erlangRequest));
        },
        cancel: function(ref: Ref) {
            if (ref in promises) {
                const { reject } = promises[ref];
                reject("Call canceled");
                delete promises[ref]; 
            }
        },
    };
}

export {
    Service,
    Ref
};
