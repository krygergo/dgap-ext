import EventEmitter from "events";
import { EventHandlerService, AsyncRead } from "../service/eventHandler";
import { Atom, Integer, Term, Tuple } from "../erlangExtTermFormat";
import { Ref } from "../service/service";

type EventType = "log" | "message" | "result";

type Listener = {
    eventType: EventType
    ref?: Ref;
    read: () => AsyncRead;
};

function listenEvent(eventEmitter: EventEmitter) {
    return async function loop(listener: Listener) {
        while (true) {
            const read = listener.read();
            listener.ref = read.ref;
            try {
                const response = await read.response;
                const event = response.content[1] as Tuple<[Atom, Term]>;
                eventEmitter.emit(listener.eventType, event.content[1]);
            } catch(error) {
                return;
            }
        }
    };
}

interface ErlangEventHandler {
    onLog(listener: (term: Tuple<[Integer, Term]>) => void): void;
    onMessage(listener: (term: Tuple<[Integer, Integer, Term]>) => void): void;
    onResult(listener: (term: Tuple<[Integer, Term]>) => void): void;
    cancel(): void;
}

export default function (id: number, eventHandlerService: EventHandlerService): ErlangEventHandler {
    const eventEmitter = new EventEmitter();
    const listen = () => {
        const logListener: Listener = {
            eventType: "log",
            read: () => eventHandlerService.readLog(id)
        };
        const messageListener: Listener = {
            eventType: "message",
            read: () => eventHandlerService.readMessage(id)
        };
        const resultListener: Listener = {
            eventType: "result",
            read: () => eventHandlerService.readResult(id)
        };
        const listeners = [logListener, messageListener, resultListener];
        listeners.forEach(listenEvent(eventEmitter));
        return () => {
            listeners.forEach(({ ref }) => {
                if (ref) {
                    eventHandlerService.cancel(ref);
                }
            });
        };
    };
    const cancel = listen();
    return {
        onLog(listener) {
            eventEmitter.on("log", listener);
        },
        onMessage(listener) {
            eventEmitter.on("message", listener);
        },
        onResult(listener) {
            eventEmitter.on("result", listener);
        },
        cancel() {
            cancel();
        }
    };
}

export {
    ErlangEventHandler
};
