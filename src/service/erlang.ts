import { Socket } from "net";
import { ErlangRequest, ErlangResponse, decode, encode } from "../util/erlangExtTermFormat";

export type ErlangService = ReturnType<typeof newErlangService>;

type Ref = string;
type ResponsePromises = {
    resolve(value: ErlangResponse | PromiseLike<ErlangResponse>): void;
    reject(reason?: any): void;
};

export function newErlangService(socket: Socket) {
    const promises: { [key: Ref]: ResponsePromises } = {};
    socket.on("data", (data: Buffer) => {
        let length = data.readInt32BE();
        let offset = 4;
        while (length <= data.length - offset) {
            const temp = data.subarray(offset, length + offset);
            const response = decode(Buffer.from(temp)) as ErlangResponse;
            const ref = response.content[0].content;
            if (ref in promises) {
                const { resolve } = promises[ref];
                resolve(response);
                delete promises[ref];
            }
            offset += length;
            if (offset < data.length) {
                length = data.readInt32BE(offset);
                offset += 4;
            }
        }
    });
    return {
        call: function(erlangRequest: ErlangRequest, timeout: number | "infinity" = 5000) {
            return new Promise<ErlangResponse>((resolve, reject) => {
                const encodedErlangRequest = encode(erlangRequest);
                if (encodedErlangRequest.length >= 1048576) {
                    return reject("Call request must not exceed 1 MB");
                }
                if (!socket.write(encodedErlangRequest)) {
                    return reject("Call write error");
                }
                promises[erlangRequest.ref()] = { resolve, reject };
                if (timeout !== "infinity") {
                    setTimeout(() => {
                        if (erlangRequest.ref() in promises) {
                            delete promises[erlangRequest.ref()];
                            reject(`Call timeout error`);
                        }
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
