import { toErlangRequest, toErlangTerm } from "../util/erlangExtTermFormat";
import { ErlangService } from "./erlang";

export type EventHandlerService = ReturnType<typeof newEventHandlerService>;

export function newEventHandlerService(erlangService: ErlangService) {
    return {
        readLog: function(id: number) {
            const request = toErlangRequest("event_handler", "read_log", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: erlangService.call(request, "infinity")
            };
        },
        readMessage: function(id: number) {
            const request = toErlangRequest("event_handler", "read_message", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: erlangService.call(request, "infinity")
            };
        },
        readResult: function(id: number) {
            const request = toErlangRequest("event_handler", "read_result", toErlangTerm("integer", id));
            return {
                ref: request.ref(),
                response: erlangService.call(request, "infinity")
            };
        },
        cancel: function(ref: string) {
            erlangService.cancel(ref);
        }
    };
}