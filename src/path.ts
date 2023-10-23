import { platform } from "os";
import { normalize } from "path";

const PLATFORM = platform();
const ROOT = __dirname.slice(0, -4);

const DGAP = normalize(`${ROOT}/dgap`);
const DGAP_BIN = normalize(`${DGAP}/bin`);

function platformSpecific<T>(option: { windows?: T, linux?: T }) {
    switch (PLATFORM) {
        case "win32":
            return option.windows;
        case "linux":
            return option.linux;
        default:
            throw new Error(`Unsuported platform ${PLATFORM}`);
    }
}

export const DGAP_BIN_EXEC = normalize(`${DGAP_BIN}/${platformSpecific({ windows: "dgap.cmd", linux: "dgap" })}`);
export const PUBLIC_HTML_GRAPH = normalize(`${ROOT}/public/html/graph.html`);