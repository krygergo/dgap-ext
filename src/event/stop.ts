import { EventMangerEmitter } from "../eventManager";

export function newStopEvent(eventEmitter: EventMangerEmitter) {
    return function() {
        eventEmitter.emitErlangStop();
    };
}
