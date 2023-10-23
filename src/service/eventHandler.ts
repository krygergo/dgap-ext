import { ErlangResponse, toErlangRequest, toErlangTerm } from "../erlangExtTermFormat";
import { Service, Ref } from "./service";

type AsyncRead = { ref: Ref, response: Promise<ErlangResponse> };

interface EventHandlerService {
    readLog(id: number): AsyncRead;
    readMessage(id: number): AsyncRead;
    readResult(id: number): AsyncRead;
    cancel(ref: Ref): void;
}

export default function(service: Service): EventHandlerService {
    return {
        readLog(id) {
            const request = toErlangRequest("event_handler", "read_log", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: service.call(request, "infinity")
            };
        },
        readMessage(id) {
            const request = toErlangRequest("event_handler", "read_message", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: service.call(request, "infinity")
            };
        },
        readResult(id) {
            const request = toErlangRequest("event_handler", "read_result", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: service.call(request, "infinity")
            };
        },
        cancel(ref) {
            service.cancel(ref);
        }
    };
}

export {
    AsyncRead,
    EventHandlerService
};
