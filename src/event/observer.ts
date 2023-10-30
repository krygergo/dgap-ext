import { execFile } from "child_process";
import { DGAP_BIN_EXEC } from "../util/path";

export function newObserverEvent() {
    return function() {
        execFile(DGAP_BIN_EXEC, ["ext", "observer"]);
    };
}
