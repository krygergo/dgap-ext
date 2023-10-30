import { commands, window } from "vscode";
import { newEventManager } from "./eventManager";
import { getContext } from "./context";

type Command = "start" | "stop" | "compile" | "simulate" | "observer";

export function newApplication() {
    const context = getContext();
    const commandCallback = newCommandCallback();
    return {
        activate: function() {
            const disposables = [
                commands.registerCommand("dgap.start", () => commandCallback("start")),
                commands.registerCommand("dgap.stop", () => commandCallback("stop")),
                commands.registerCommand("dgap.compile", () => commandCallback("compile")),
                commands.registerCommand("dgap.simulate", () => commandCallback("simulate")),
                commands.registerCommand("dgap.observer", () => commandCallback("observer"))
            ];
            context.subscriptions.push(...disposables);
        }
    };
}

function newCommandCallback() {
    const eventManger = newEventManager();
    return async function (command: Command) {
        try {
            switch (command) {
                case "start":
                    eventManger.start();
                    break;
                case "stop":
                    eventManger.stop();
                    break;
                case "compile":
                    await eventManger.compile();
                    break;
                case "simulate":
                    await eventManger.simulate();
                    break;
                case "observer":
                    eventManger.observer();
                    break;
            }
        } catch (error) {
            if (error instanceof Error) {
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unknown error");
            }
        }
    };
}
