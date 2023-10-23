import { readFileSync } from "fs";
import { Uri, ViewColumn, window } from "vscode";
import { PUBLIC_HTML_GRAPH } from "../path";
import { ErlangEventHandler} from "../handler/erlangEvent";
import { Tuple } from "../erlangExtTermFormat";

type Message<Type, Data> = {
    type: Type;
    data: Data;
};

type ExtensionMessage<T> = Message<"topology" | "log" | "message" | "result", T>;
type WebviewMessage<T> = Message<"removelink" | "reinsertlink", T>;

interface GraphWebview {
    postMessage<T>(message: ExtensionMessage<T>): void;
    onMessage(listener: (message: WebviewMessage<unknown>) => void): void;
    onDispose(listener: () => void): void;
    onErlangEvent(erlangEventHandler: ErlangEventHandler): void;
}

export default function (extensionUri: Uri, title: string): GraphWebview {
    const webviewPanel = window.createWebviewPanel("dgap", title, ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    webviewPanel.webview.html = readFileSync(PUBLIC_HTML_GRAPH).toString("utf8")
        .replace("graph.css", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "public", "css", "graph.css")).toString())
        .replace("graphology.umd.min.js", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "node_modules", "graphology", "dist", "graphology.umd.min.js")).toString())
        .replace("sigma.min.js", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "node_modules", "sigma", "build", "sigma.min.js")).toString())
        .replace("graph.mjs", webviewPanel.webview.asWebviewUri(Uri.joinPath(extensionUri, "out", "webview", "graph.mjs")).toString());
    return {
        postMessage(message) {
            webviewPanel.webview.postMessage(message);
        },
        onMessage(listener) {
            webviewPanel.webview.onDidReceiveMessage(listener);
        },
        onDispose(listener) {
            webviewPanel.onDidDispose(listener);
        },
        onErlangEvent(eventHandler) {
            webviewPanel.onDidDispose(eventHandler.cancel);
            eventHandler.onLog(log => this.postMessage({
                type: "log",
                data: [ log.content[0].toString(), log.content[1].toString() ]
            }));
            eventHandler.onMessage(message => this.postMessage({
                type: "message",
                data: [ message.content[0].toString(), message.content[1].toString(), message.content[2].toString() ]
            }));
            eventHandler.onResult(result => this.postMessage({
                type: "result",
                data: [ result.content[0].toString(), result.content[1].toString() ]
            }));
        }
    };
}

export {
    GraphWebview,
    ExtensionMessage,
    WebviewMessage
};