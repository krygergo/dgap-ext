import S from "sigma";
import G from "graphology";
import { SigmaEdgeEventPayload } from "sigma/sigma.js";

type Topology = [number, number[]][];

type Edges = { [key: string]: Edge };

type Vertices = { [key: number]: Vertex };

interface Edge {
    active: boolean;
    source: number;
    target: number;
}

interface Vertex {
    edges: number[];
}

declare const Sigma: typeof S.default;
declare const graphology: typeof G.default;
const Graphology = graphology;
const vscode = acquireVsCodeApi();
const sigmaContainer = document.getElementById("sigma-container") as HTMLElement;
const graph = new Graphology();
const sigma = new Sigma(graph, sigmaContainer, {
    enableEdgeClickEvents: true,
    labelColor: {
        color: "orange"
    }
});

window.addEventListener("message", graphWebview());

function postMessage(message: any) {
    vscode.postMessage(message);
}

function graphWebview() {
    const vertices: Vertices = {};
    const edges: Edges = {};
    sigma.addListener("clickEdge", onEdgeClick(edges));
    return (message: MessageEvent<any>) => {
        messageDataHandler(vertices, edges, message.data);
    };
}

function messageDataHandler(vertices: Vertices, edges: Edges, { type, data }: any) {
    switch (type) {
        case "topology":
            return topologyHandler(vertices, edges, data as Topology);
        case "log":
            return logHandler(data as [string, string]);
        case "message":
            return messageHandler(data as [string, string, string]);
        case "result":
            return resultHandler(data as [string, string]);
    }
}

function logHandler([id, log]: [string, string]) {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<span style="color: orange">${id}:</span>
    <span style="color: lightskyblue">${log}</span>`;
    logList.prepend(listItem);
}

function messageHandler([senderId, id, message]: [string, string, string]) {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<span style="color: orange">${senderId}</span>
    <span style="color: red">--></span>
    <span style="color: orange">${id}:</span>
    <span style="color: lightskyblue">${message}</span>`;
    messageList.prepend(listItem);
}

function resultHandler([id, result]: [string, string]) {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<span style="color: orange">${id}:</span>
    <span style="color: lightskyblue">${result}</span>`;
    resultList.prepend(listItem);
}

function topologyHandler(vertices: Vertices, edges: Edges, topology: Topology) {
    topology.forEach(([id, edges]) => {
        if (id in vertices) {
            return;
        }
        vertices[id] = { edges };
    });
    graph.clear();
    const entries = Object.entries(vertices);
    entries.map<[number, Vertex]>(([id, vertex]) => [parseInt(id), vertex]).forEach(([id, vertex], index) => {
        const angle = (2 * Math.PI * index) / entries.length;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        graph.addNode(id, { label: id, x, y, size: 6, color: "orange" });
        vertex.edges
            .filter(edge => graph.hasNode(edge))
            .filter(edge => !graph.hasEdge(id, edge))
            .forEach(edge => {
                const active = true;
                const source = id;
                const target = edge;
                const geid = graph.addEdge(id, edge, { size: 3 });
                edges[geid] = { active, source, target };
            });
    });
    sigma.refresh();
}

function onEdgeClick(edges: Edges) {
    return (payload: SigmaEdgeEventPayload) => {
        const edge = edges[payload.edge];
        if (edge.active) {
            graph.setEdgeAttribute(payload.edge, "color", "red");
            postMessage({
                type: "removelink",
                data: [edge.source, edge.target]
            });
        } else {
            graph.setEdgeAttribute(payload.edge, "color", undefined);
            postMessage({
                type: "reinsertlink",
                data: [edge.source, edge.target]
            });
        }
        edge.active = !edge.active;
        sigma.refresh();
    };
}

const ARROW_DOUBLE_START_SVG_HTML = `<svg fill="#000000" width="16px" height="16px" viewBox="0 0 1920 1920">
    <g fill-rule="evenodd">
        <path d="M1052 92.168 959.701 0-.234 959.935 959.701 1920l92.299-92.43-867.636-867.635L1052 92.168Z"/>
        <path d="M1920 92.168 1827.7 0 867.766 959.935 1827.7 1920l92.3-92.43-867.64-867.635L1920 92.168Z"/>
    </g>
</svg>`;

const ARROW_DOUBLE_END_SVG_HTML = `<svg fill="#000000" width="16px" height="16px" viewBox="0 0 1920 1920">
    <g fill-rule="evenodd">
        <path d="M0 92.168 92.299 0l959.931 959.935L92.299 1920 0 1827.57l867.636-867.635L0 92.168Z"/>
        <path d="M868 92.168 960.299 0l959.931 959.935L960.299 1920 868 1827.57l867.64-867.635L868 92.168Z"/>
    </g>
</svg>`;

const READ_CONTAINER_HTML = `<div class="read-border"></div>
<div class="read-container-body">
    <div class="read-header">
        <span>Message</span>
        <span>Result</span>
        <span>Log</span>
    </div>
    <div class="read-list"></div>
</div>`;

const background = document.getElementById("background") as HTMLDivElement;

const arrowDoubleStart = document.createElement("div");
arrowDoubleStart.innerHTML = ARROW_DOUBLE_START_SVG_HTML;
const arrowDoubleStartSvg = arrowDoubleStart.firstChild!;

const arrowDoubleEnd = document.createElement("div");
arrowDoubleEnd.innerHTML = ARROW_DOUBLE_END_SVG_HTML;
const arrowDoubleEndSvg = arrowDoubleEnd.firstChild!;

const readContainer = document.createElement("div");
readContainer.setAttribute("class", "read-container");
readContainer.innerHTML = READ_CONTAINER_HTML;

const readHeaderSpanMessage = readContainer.children[1].children[0].children[0];
const readHeaderSpanResult = readContainer.children[1].children[0].children[1];
const readHeaderSpanLog = readContainer.children[1].children[0].children[2];

const messageList = document.createElement("ul");

const resultList = document.createElement("ul");

const logList = document.createElement("ul");

readHeaderSpanMessage.addEventListener("click", () => {
    if (readHeaderSpanMessage.classList.contains("active")) {
        readHeaderSpanMessage.classList.remove("active");
        document.getElementsByClassName("read-list")[0].removeChild(messageList);
    } else {
        readHeaderSpanMessage.classList.add("active");
        document.getElementsByClassName("read-list")[0].appendChild(messageList);
    }
});

readHeaderSpanResult.addEventListener("click", () => {
    if (readHeaderSpanResult.classList.contains("active")) {
        readHeaderSpanResult.classList.remove("active");
        document.getElementsByClassName("read-list")[0].removeChild(resultList);
    } else {
        readHeaderSpanResult.classList.add("active");
        document.getElementsByClassName("read-list")[0].appendChild(resultList);
    }
});

readHeaderSpanLog.addEventListener("click", () => {
    if (readHeaderSpanLog.classList.contains("active")) {
        readHeaderSpanLog.classList.remove("active");
        document.getElementsByClassName("read-list")[0].removeChild(logList);
    } else {
        readHeaderSpanLog.classList.add("active");
        document.getElementsByClassName("read-list")[0].appendChild(logList);
    }
});

const readToggle = document.getElementById("read-toggle") as HTMLDivElement;
readToggle.appendChild(arrowDoubleStartSvg);
readToggle.addEventListener("click", event => {
    if (event.target === arrowDoubleStartSvg) {
        readToggle.removeChild(arrowDoubleStartSvg);
        readToggle.appendChild(arrowDoubleEndSvg);
        background.appendChild(readContainer);
    } else {
        readToggle.removeChild(arrowDoubleEndSvg);
        readToggle.appendChild(arrowDoubleStartSvg);
        background.removeChild(readContainer);
    }
    sigma.refresh();
});