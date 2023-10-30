import path from "path";
import { Uri, workspace } from "vscode";

type Topology = {
    size: number;
} & ({
    type: "ring" | "complete";
} | {
    type: "random";
    alpha: number;
});

interface Compile {
    file: string;
}

interface Simulate {
    module: string;
    fun: string;
    topology: Topology;
}

interface DGAPConfig {
    compile?: Compile;
    simulate?: Simulate;
}

async function newDgapConfig(): Promise<DGAPConfig> {
    if (!workspace.workspaceFolders) {
        throw new Error("No folder open");
    }
    const directories = await Promise.all(workspace.workspaceFolders.map(async folder => {
        const path = folder.uri.fsPath;
        const files = await workspace.fs.readDirectory(folder.uri);
        return { path, files };
    }));
    const dgapConfigPath = directories.reduce<string>((acc, directory) => {
        if (acc) {
            return acc;
        }
        return directory.files.reduce<string>((acc, file) => {
            if (acc) {
                return acc;
            }
            const fileName = file[0];
            if (fileName === "dgap.json") {
                return path.join(directory.path, fileName);
            }
            return acc;
        }, "");
    }, "");
    if (!dgapConfigPath) {
        throw new Error("No dgap.json file found");
    }
    const dgapConfig = await workspace.fs.readFile(Uri.file(dgapConfigPath));
    return JSON.parse(Buffer.from(dgapConfig).toString("utf8"));
}

export async function newCompileConfig() {
    const dgapConfig = await newDgapConfig();
    return dgapConfig.compile;
}

export async function newSimulateConfig() {
    const dgapConfig = await newDgapConfig();
    return dgapConfig.simulate;
}
