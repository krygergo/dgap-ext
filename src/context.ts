import { ExtensionContext } from "vscode";

interface Context {
    extensionContext?: ExtensionContext
}

const context: Context = {};

export function setContext(extensionContext: ExtensionContext) {
    context.extensionContext = extensionContext;
}

export function getContext() {
    if (!context.extensionContext) {
        throw new Error("No context");
    }
    return context.extensionContext;
}
