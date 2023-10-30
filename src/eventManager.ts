import { EventEmitter } from "events";
import { newStartEvent } from "./event/start";
import { newStopEvent } from "./event/stop";
import { newCompileEvent } from "./event/compile";
import { newSimulateEvent } from "./event/simulate";
import { ErlangService } from "./service/erlang";
import { Uri } from "vscode";
import { newObserverEvent } from "./event/observer";

export type EventMangerEmitter = ReturnType<typeof newEventEmitter>;

export function newEventManager() {
    const eventEmitter = newEventEmitter();
    const startEvent = newStartEvent(eventEmitter);
    const stopEvent = newStopEvent(eventEmitter);
    const compileEvent = newCompileEvent(eventEmitter);
    const simulateEvent = newSimulateEvent(eventEmitter);
    const observerEvent = newObserverEvent();
    return {
        start: startEvent,
        stop: stopEvent,
        compile: compileEvent,
        simulate: simulateEvent,
        observer: observerEvent
    };
}

export function newEventEmitter() {
    const eventEmitter = new EventEmitter();
    return {
        onErlangStop: function(handler: () => void) {
            eventEmitter.on("stop", handler);
        },
        emitErlangStop: function() {
            eventEmitter.emit("stop");
        },
        onErlangStart: function(handler: (erlangService: ErlangService) => void) {
            eventEmitter.on("start", handler);
        },
        emitErlangStart: function(erlangService: ErlangService) {
            eventEmitter.emit("start", erlangService);
        }
    };
}
